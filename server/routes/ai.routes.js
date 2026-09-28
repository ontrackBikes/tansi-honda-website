const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Bike = require("../models/bike.model");
const Service = require("../models/service.model");
const Lead = require("../models/lead.model");
const Contact = require("../models/contact.model");
const PRODUCT_ALIASES = require("../utils/productAliases");

// Integration endpoints for the WhatsApp AI assistant (spec v1):
//   POST /api/ai/customer-context  { phone, channel }
//   GET  /api/ai/catalog?q=&sku=&limit=&location=
//   GET  /api/ai/catalog?mode=index   (every product + aliases, no prices)
// Auth: "Authorization: Bearer <AI_API_KEY>".

const SCHEMA_VERSION = "1";
// Strip trailing slashes so paths don't end up as "//e2w/..."
const BASE_URL = (
  process.env.PUBLIC_BASE_URL || "https://www.tansihonda.com"
).replace(/\/+$/, "");

// The spec asks for a response within 3s — cap every DB query below that.
const QUERY_TIMEOUT_MS = 2500;

// ================= AUTH =================
router.use((req, res, next) => {
  const key = process.env.AI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: "AI integration not configured" });
  }

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  const a = Buffer.from(token);
  const b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ================= HELPERS =================

// ISO 8601 in IST (fixed +05:30, India has no DST)
const toIST = (date) => {
  if (!date) return null;
  const t = new Date(date);
  if (isNaN(t)) return null;
  const shifted = new Date(t.getTime() + 330 * 60 * 1000);
  return shifted.toISOString().slice(0, 19) + "+05:30";
};

const toISTDate = (date) => toIST(date)?.slice(0, 10) || null;

// Stored phones are inconsistent ("9876543210", "919876543210", "+91 98765 43210"
// on contact forms), so match the last 10 digits allowing any separators.
const phoneRegex = (last10) =>
  new RegExp(last10.split("").join("\\D*") + "\\D*$");

const modelUrl = (bike) => `${BASE_URL}/${bike.category}/${bike.slug}`;

const STATUS_RANK = {
  active: 0,
  upcoming: 1,
  pending: 2,
  completed: 3,
  cancelled: 4,
};

// Seed writes 0 for missing prices — treat that as "not available"
const priceOrNull = (n) => (typeof n === "number" && n > 0 ? n : null);

// ================= CUSTOMER CONTEXT =================

const SERVICE_STATUS = {
  pending: { status: "pending", label: "Awaiting confirmation" },
  confirmed: { status: "upcoming", label: "Service booking confirmed" },
  completed: { status: "completed", label: "Service completed" },
};

const LEAD_STATUS = {
  New: "pending",
  Contacted: "active",
  Interested: "active",
  "Follow-up": "active",
  "Not Interested": "cancelled",
};

const CONTACT_STATUS = {
  new: { status: "pending", label: "Message received" },
  contacted: { status: "active", label: "Our team has contacted you" },
  closed: { status: "completed", label: "Resolved" },
};

const serviceToRecord = (s) => {
  let st = SERVICE_STATUS[s.status] || SERVICE_STATUS.pending;
  // Admins rarely mark bookings completed, so a booking whose date has
  // passed shouldn't be presented as still awaiting confirmation.
  const today = toISTDate(new Date());
  const date = toISTDate(s.preferredDate);
  if (s.status !== "completed" && date && date < today) {
    st = { status: "completed", label: "Booking date has passed" };
  }
  const details = {
    service_centre: s.serviceCentre,
    pickup_drop: s.pickupDrop ? "Yes" : "No",
  };
  if (s.pickupDrop && s.address) details.pickup_address = s.address;

  return {
    type: "service",
    id: `SRV-${s._id}`,
    title: `${s.model} service booking`,
    status: st.status,
    status_label: st.label,
    start_at: toISTDate(s.preferredDate), // date-only field
    end_at: null,
    amount: null,
    tracking: null,
    links: [{ label: "Book another service", url: `${BASE_URL}/book-service` }],
    details,
    _sortAt: s.updatedAt,
  };
};

const leadToRecord = (l, bikesByName) => {
  const bike = bikesByName.get(l.modelName);
  const title = [l.modelName, l.variantName].filter(Boolean).join(" — ");

  return {
    type: "enquiry",
    id: `LEAD-${l._id}`,
    title,
    status: LEAD_STATUS[l.status] || "pending",
    status_label: `${l.source} enquiry — ${l.status}`,
    start_at: toIST(l.createdAt),
    end_at: null,
    amount: null,
    tracking: null,
    links: bike ? [{ label: "Model details", url: modelUrl(bike) }] : [],
    details: { source: l.source },
    _sortAt: l.updatedAt,
  };
};

const contactToRecord = (c) => {
  const st = CONTACT_STATUS[c.status] || CONTACT_STATUS.new;
  return {
    type: "ticket",
    id: `MSG-${c._id}`,
    title: c.subject,
    status: st.status,
    status_label: st.label,
    start_at: toIST(c.createdAt),
    end_at: null,
    amount: null,
    tracking: null,
    links: [],
    details: { message: c.message.slice(0, 200) },
    _sortAt: c.updatedAt,
  };
};

router.post("/customer-context", async (req, res) => {
  try {
    const digits = String(req.body?.phone || "").replace(/\D/g, "");
    if (digits.length < 10) {
      return res.status(400).json({ error: "phone is required" });
    }
    const last10 = digits.slice(-10);
    const re = phoneRegex(last10);

    const [services, leads, contacts] = await Promise.all([
      Service.find({ mobile: re })
        .sort({ updatedAt: -1 })
        .limit(20)
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      Lead.find({ phone: re })
        .sort({ updatedAt: -1 })
        .limit(20)
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      Contact.find({ phone: re })
        .sort({ updatedAt: -1 })
        .limit(20)
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
    ]);

    const all = [...services, ...leads, ...contacts];
    if (all.length === 0) {
      return res.json({ schema_version: SCHEMA_VERSION, found: false });
    }

    // Most recent submission carries the freshest name/email
    const byRecent = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
    const name = byRecent.map((d) => d.name || d.fullName).find(Boolean);
    const email = byRecent.map((d) => d.email).find(Boolean) || null;
    const since = all.reduce(
      (min, d) => (d.createdAt < min ? d.createdAt : min),
      all[0].createdAt,
    );

    const tags = [];
    if (services.length) tags.push("service_customer");
    if (services.length > 1) tags.push("repeat");
    if (leads.length) tags.push("purchase_enquiry");

    const leadModelNames = [...new Set(leads.map((l) => l.modelName))];
    const bikes = leadModelNames.length
      ? await Bike.find({ name: { $in: leadModelNames } })
          .select("name slug category")
          .maxTimeMS(QUERY_TIMEOUT_MS)
          .lean()
      : [];
    const bikesByName = new Map(bikes.map((b) => [b.name, b]));

    const records = [
      ...services.map(serviceToRecord),
      ...leads.map((l) => leadToRecord(l, bikesByName)),
      ...contacts.map(contactToRecord),
    ]
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          b._sortAt - a._sortAt,
      )
      .slice(0, 10)
      .map(({ _sortAt, ...r }) => r);

    res.json({
      schema_version: SCHEMA_VERSION,
      found: true,
      customer: {
        id: `91${last10}`,
        name,
        phone: `91${last10}`,
        email,
        since: toISTDate(since),
        tags,
      },
      records,
      dues: [],
      documents: [],
      notes: [],
    });
  } catch (err) {
    console.error("🔥 [AI Customer Context Error]:", err.message);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// ================= CATALOG =================

const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const variantKey = (v) =>
  normalize(v.sku || v.name).replace(/ /g, "-") || "std";

const ATTRIBUTE_KEYS = [
  "displacement",
  "power",
  "max_power",
  "torque",
  "top_speed",
  "range",
  "battery_capacity",
  "charging_time",
  "fuel_tank",
  "kerb_weight",
  "mileage",
];

// specs sections are { show, items: [{ key: value }, ...] }
const pickAttributes = (bike, variant) => {
  const attrs = {
    fuel: bike.category === "e2w" ? "electric" : "petrol",
  };
  for (const section of Object.values(variant.specs || {})) {
    for (const item of section?.items || []) {
      if (!item || typeof item !== "object") continue;
      for (const [k, v] of Object.entries(item)) {
        if (ATTRIBUTE_KEYS.includes(k) && !(k in attrs) && v !== "") {
          attrs[k] = String(v).slice(0, 60);
        }
      }
    }
  }
  const colors = (bike.colors || []).map((c) => c.name).filter(Boolean);
  if (colors.length) attrs.colors = colors.join(", ");
  return attrs;
};

const compactText = (x) => normalize(x).replace(/ /g, "");

// Variant name worth showing next to the model name ("" for "Standard" or
// when the model name already contains it, e.g. "Hornet 750")
const variantLabel = (bike, variant) =>
  variant.name &&
  variant.name.toLowerCase() !== "standard" &&
  !compactText(bike.name).includes(compactText(variant.name))
    ? variant.name
    : "";

const itemSku = (bike, variant) => `${bike.slug}/${variantKey(variant)}`;

const itemName = (bike, variant) =>
  [bike.name, variantLabel(bike, variant)].filter(Boolean).join(" ");

const variantToItem = (bike, variant) => {
  const p = variant.price || {};
  const currency = p.currency || "INR";

  const prices = [
    { label: "Ex-showroom", amount: priceOrNull(p.exShowroom), currency },
    {
      label: "On-road",
      amount: priceOrNull(p.onRoadBase),
      currency,
      note: "Includes road tax, registration and insurance (5-year OD + 1-year PA)",
    },
    {
      label: "On-road with zero-depreciation insurance",
      amount: priceOrNull(p.finalOnRoad),
      currency,
    },
  ];

  const item = {
    sku: itemSku(bike, variant),
    name: itemName(bike, variant),
    category: bike.category,
    url: modelUrl(bike),
    prices,
    conditions: [],
    attributes: pickAttributes(bike, variant),
    updated_at: toIST(bike.updatedAt),
  };

  if (bike.bookingsOpen) {
    item.availability = { status: "on_request", next_available_at: null };
    item.conditions.push("Pre-booking only — deliveries have not started yet");
  }

  return item;
};

// Lowercase, single-spaced; keeps punctuation customers type ("h'ness")
const cleanAlias = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const aliasesFor = (bike, variant) => {
  const shortName = bike.name.replace(/^honda\s+/i, "");
  const curated = PRODUCT_ALIASES[bike.slug] || [];
  const variantName = normalize(variantLabel(bike, variant)); // "h smart"
  // Only short names get a compact form: "sp125" yes, "activa110anniversaryedition" no
  const compactName =
    shortName.split(/\s+/).length <= 2 ? compactText(shortName) : "";

  const aliases = [
    shortName,
    normalize(shortName), // "CB350 H'ness" → "cb350 h ness"
    compactName,
    bike.name,
    ...curated,
  ];

  if (variantName) {
    // "activa dlx", "shine 125 disc", "sp125 dlx"
    for (const base of [shortName, curated[0], compactName]) {
      if (base) aliases.push(`${base} ${variantName}`);
    }
  }

  return [...new Set(aliases.map(cleanAlias).filter(Boolean))];
};

const catalogIndex = (bikes) =>
  bikes.flatMap((bike) =>
    (bike.variants || []).map((variant) => ({
      sku: itemSku(bike, variant),
      name: itemName(bike, variant),
      category: bike.category,
      aliases: aliasesFor(bike, variant),
    })),
  );

router.get("/catalog", async (req, res) => {
  try {
    if (req.query.mode === "index") {
      const bikes = await Bike.find({ isActive: true })
        .select("name slug category variants.name variants.sku")
        .sort({ category: 1, name: 1 })
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean();
      return res.json({
        schema_version: SCHEMA_VERSION,
        items: catalogIndex(bikes),
      });
    }

    const q = normalize(req.query.q);
    const sku = String(req.query.sku || "")
      .trim()
      .toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
    // `location` is accepted but ignored — Tansi Honda has a single price list.

    if (!q && !sku) {
      return res.status(400).json({ error: "q or sku is required" });
    }

    // Catalog is small (a few dozen models), so filter in memory
    const bikes = await Bike.find({ isActive: true })
      .select("name slug category bookingsOpen colors variants updatedAt")
      .maxTimeMS(QUERY_TIMEOUT_MS)
      .lean();

    const candidates = bikes.flatMap((bike) =>
      (bike.variants || []).map((variant) => ({ bike, variant })),
    );

    let matches;

    if (sku) {
      // Accept our composite "<slug>/<variant>" or a raw variant SKU
      matches = candidates.filter(
        ({ bike, variant }) =>
          itemSku(bike, variant) === sku ||
          (variant.sku && variant.sku.toLowerCase() === sku),
      );
    } else {
      const tokens = q.split(" ").filter(Boolean);
      const scored = candidates.map((c) => {
        const modelText = normalize(`${c.bike.name} ${c.bike.slug}`);
        const text = normalize(
          `${modelText} ${c.variant.name} ${c.variant.sku} ${c.bike.category}`,
        );
        // Compact form lets "sp125" match "SP 125" and vice versa
        const compact = text.replace(/ /g, "");
        const words = text.split(" ");

        let score = 0;
        for (const t of tokens) {
          if (words.includes(t)) score += 2;
          else if (compact.includes(t)) score += 1;
        }
        if (compact.includes(q.replace(/ /g, ""))) score += 2;
        if (modelText.includes(q)) score += 1;
        const full = tokens.every((t) => compact.includes(t));
        return { ...c, score, full };
      });

      const full = scored.filter((s) => s.full);
      matches = (full.length ? full : scored.filter((s) => s.score > 0)).sort(
        (a, b) => b.score - a.score,
      );
    }

    res.json({
      schema_version: SCHEMA_VERSION,
      items: matches
        .slice(0, limit)
        .map(({ bike, variant }) => variantToItem(bike, variant)),
    });
  } catch (err) {
    console.error("🔥 [AI Catalog Error]:", err.message);
    res.status(500).json({ error: "Catalog lookup failed" });
  }
});

module.exports = router;
