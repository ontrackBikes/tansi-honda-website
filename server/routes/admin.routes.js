const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const Service = require("../models/service.model");
const Lead = require("../models/lead.model");
const Contact = require("../models/contact.model");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (email !== process.env.ADMIN_EMAIL) {
    return res.send("Invalid credentials");
  }

  const isMatch = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD);

  if (!isMatch) {
    return res.send("Invalid credentials");
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("token", token, { httpOnly: true });

  res.redirect("/admin");
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/admin/login");
});

router.get("/login", (req, res) => {
  res.render("admin/login");
});

// Dashboard
router.get("/", auth, async (req, res) => {
  const models = await Bike.find();
  res.render("admin/dashboard", { models });
});

// Dashboard
router.get("/models", auth, async (req, res) => {
  const models = await Bike.find();
  res.render("admin/models", { models });
});

// Add Model Page
router.get("/add", auth, (req, res) => {
  res.render("admin/add-model");
});

// ---------------------------------------------------------------------
// Helpers to normalize the JSON payload posted by add-model.ejs /
// edit-model.ejs (see public/js/admin-model-form.js) into the exact
// nested shape required by server/models/bike.model.js.
// ---------------------------------------------------------------------
const ALLOWED_CATEGORIES = ["motorcycle", "scooter", "e2w"];
const ALLOWED_SUBCATEGORIES = ["RedWing", "BigWing"];

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");

const toFeatureSection = (section) => {
  const items = Array.isArray(section?.items)
    ? section.items
        .filter((it) => it && (it.title || it.image || it.description))
        .map((it) => ({
          title: it.title || "",
          image: it.image || "",
          description: it.description || "",
        }))
    : [];
  return { show: !!section?.show && items.length > 0, items };
};

const toSpecSection = (section) => {
  const items = Array.isArray(section?.items)
    ? section.items
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const key = Object.keys(it)[0];
          if (!key) return null;
          const value = it[key];
          if (value === undefined || value === null || value === "") return null;
          return { [key]: value };
        })
        .filter(Boolean)
    : [];
  return { show: !!section?.show && items.length > 0, items };
};

const buildBikePayload = (body = {}) => {
  const category = ALLOWED_CATEGORIES.includes(body.category)
    ? body.category
    : "motorcycle";
  const subCategory =
    category === "motorcycle" && ALLOWED_SUBCATEGORIES.includes(body.subCategory)
      ? body.subCategory
      : null;

  const colors = Array.isArray(body.colors)
    ? body.colors
        .filter((c) => c && (c.name || c.code || c.image))
        .map((c) => ({
          name: c.name || "",
          code: c.code || "",
          image: c.image || "",
        }))
    : [];

  const featuresIn = body.features || {};
  const features = {
    safety: toFeatureSection(featuresIn.safety),
    comfort: toFeatureSection(featuresIn.comfort),
    design: toFeatureSection(featuresIn.design),
    technology: toFeatureSection(featuresIn.technology),
  };

  const variants = Array.isArray(body.variants)
    ? body.variants.map((v) => {
        const p = v.price || {};
        const specsIn = v.specs || {};
        return {
          name: v.name || "",
          sku: v.sku || "",
          price: {
            exShowroom: Number(p.exShowroom) || 0,
            roadTaxAndReg: Number(p.roadTaxAndReg) || 0,
            insuranceBase: Number(p.insuranceBase) || 0,
            onRoadBase: Number(p.onRoadBase) || 0,
            zeroDepPremium: Number(p.zeroDepPremium) || 0,
            finalOnRoad: Number(p.finalOnRoad) || 0,
            currency: p.currency || "INR",
          },
          specs: {
            performance: toSpecSection(specsIn.performance),
            body: toSpecSection(specsIn.body),
            engine: toSpecSection(specsIn.engine),
            motor: toSpecSection(specsIn.motor),
            transmission: toSpecSection(specsIn.transmission),
            tyres: toSpecSection(specsIn.tyres),
            suspension: toSpecSection(specsIn.suspension),
            electricals: toSpecSection(specsIn.electricals),
            chassis: toSpecSection(specsIn.chassis),
            battery_and_charging: toSpecSection(specsIn.battery_and_charging),
            connectivity_features: toSpecSection(specsIn.connectivity_features),
          },
        };
      })
    : [];

  return {
    name: (body.name || "").trim(),
    category,
    subCategory,
    description: body.description || "",
    coverImage: body.coverImage || "",
    brochure: body.brochure || "",
    isActive: body.isActive !== false,
    bookingsOpen: !!body.bookingsOpen,
    colors,
    features,
    variants,
  };
};

// Create Model
router.post("/add", auth, async (req, res) => {
  try {
    const payload = buildBikePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ message: "Model name is required." });
    }
    if (!payload.colors.length) {
      return res.status(400).json({ message: "At least one color variant is required." });
    }
    if (!payload.variants.length || !payload.variants[0].price.exShowroom) {
      return res
        .status(400)
        .json({ message: "At least one variant with an Ex-Showroom price is required." });
    }

    const slug = slugify(payload.name);
    const existing = await Bike.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "A model with this name already exists." });
    }

    const bike = await Bike.create({ ...payload, slug });

    res.json({ message: "Model created successfully", redirect: "/admin/models", id: bike._id });
  } catch (err) {
    console.error("Add model error:", err);
    res.status(500).json({ message: err.message || "Error adding model" });
  }
});

// Edit Page
router.get("/edit/:id", auth, async (req, res) => {
  const model = await Bike.findById(req.params.id);
  res.render("admin/edit-model", { model });
});

// Update Model
router.post("/edit/:id", auth, async (req, res) => {
  try {
    const payload = buildBikePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({ message: "Model name is required." });
    }
    if (!payload.colors.length) {
      return res.status(400).json({ message: "At least one color variant is required." });
    }
    if (!payload.variants.length || !payload.variants[0].price.exShowroom) {
      return res
        .status(400)
        .json({ message: "At least one variant with an Ex-Showroom price is required." });
    }

    const slug = slugify(payload.name);
    const conflict = await Bike.findOne({ slug, _id: { $ne: req.params.id } });
    if (conflict) {
      return res.status(400).json({ message: "Another model already uses this name/slug." });
    }

    const bike = await Bike.findByIdAndUpdate(
      req.params.id,
      { ...payload, slug },
      { new: true, runValidators: true },
    );

    if (!bike) {
      return res.status(404).json({ message: "Model not found" });
    }

    res.json({ message: "Model updated successfully", redirect: "/admin/models" });
  } catch (err) {
    console.error("Edit model error:", err);
    res.status(500).json({ message: err.message || "Error updating model" });
  }
});

// update ex-showroom price
router.post("/update-price/:bikeId/:variantId", auth, async (req, res) => {
  try {
    const { bikeId, variantId } = req.params;

    // 1. Destructure all fields from req.body (matches the data-field attributes in our modal)
    const {
      exShowroom,
      roadTaxAndReg,
      insuranceBase,
      onRoadBase,
      zeroDepPremium,
      finalOnRoad,
    } = req.body;

    // 2. Basic validation: ensure at least the base price exists
    if (exShowroom === undefined) {
      return res.status(400).json({ message: "Ex-Showroom price is required" });
    }

    // 3. Update the specific variant's price object
    // Using "variants.$.price" replaces the entire price sub-document with the new values
    const bike = await Bike.findOneAndUpdate(
      {
        _id: bikeId,
        "variants._id": variantId,
      },
      {
        $set: {
          "variants.$.price": {
            exShowroom: Number(exShowroom),
            roadTaxAndReg: Number(roadTaxAndReg || 0),
            insuranceBase: Number(insuranceBase || 0),
            onRoadBase: Number(onRoadBase || 0),
            zeroDepPremium: Number(zeroDepPremium || 0),
            finalOnRoad: Number(finalOnRoad || 0),
            currency: "INR", // Keeping default or getting from req.body
          },
        },
      },
      { new: true },
    );

    if (!bike) {
      return res.status(404).json({ message: "Bike or Variant not found" });
    }

    res.json({
      message: "Detailed prices updated successfully ✅",
      // Optional: return only the updated variant for clarity
      updatedVariant: bike.variants.find((v) => v._id.toString() === variantId),
    });
  } catch (err) {
    console.error("Update Price Error:", err);
    res
      .status(500)
      .json({ message: "Internal server error while updating price" });
  }
});

// Toggle Active/Inactive Status
router.post("/toggle-status/:id", auth, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).send("Model not found");

    bike.isActive = !bike.isActive; // Flip the status
    await bike.save();

    res.redirect("/admin/models"); // Or wherever your list is
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ADMIN VIEW - SERVICES
router.get("/services", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const toast = req.query.toast || "";
  const statusFilter = req.query.status || "";

  let filter = {};
  if (statusFilter) {
    filter.status = statusFilter;
  }

  const totalRecords = await Service.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  const services = await Service.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Stats always reflect the full collection (not the current status filter),
  // same pattern as /admin/leads and /admin/contact-us.
  const stats = {
    total: await Service.countDocuments(),
    pending: await Service.countDocuments({ status: "pending" }),
    confirmed: await Service.countDocuments({ status: "confirmed" }),
    completed: await Service.countDocuments({ status: "completed" }),
    followUp: await Service.countDocuments({ status: "follow-up" }),
  };

  res.render("admin/services", {
    services,
    toast,
    currentPage: page,
    totalPages,
    totalRecords,
    stats,
    currentStatus: statusFilter,
  });
});

// UPDATE STATUS - SERVICES
router.post("/services/:id", auth, async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
  });
  res.redirect("/admin/services?toast=updated");
});

// DELETE - SERVICES
router.post("/services/delete/:id", auth, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.redirect("/admin/services");
});

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const upload = require("../middleware/upload");

// Upload Image API
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filename = `bike-${uuidv4()}.jpg`;
    const outputPath = path.join(__dirname, "../../public/images", filename);

    // Resize & optimize
    await sharp(req.file.buffer)
      .resize(800, 600, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Return URL
    res.json({
      message: "Upload successful",
      url: `/images/${filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// ===============================
// WEBSITE LEADS MANAGEMENT
// ===============================

// All Leads Page + Pagination + Date Filter
router.get("/leads", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const from = req.query.from || "";
  const to = req.query.to || "";
  const toast = req.query.toast || "";
  const statusFilter = req.query.status || ""; // Get status from URL

  let filter = {};

  // Date Filtering
  if (from && to) {
    filter.createdAt = {
      $gte: new Date(from + "T00:00:00"),
      $lte: new Date(to + "T23:59:59"),
    };
  }

  // Status Filtering - Add this block!
  if (statusFilter) {
    filter.status = statusFilter;
  }

  const totalRecords = await Lead.countDocuments(filter);
  const totalPages = Math.ceil(totalRecords / limit);

  const leads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Stats should usually show totals regardless of the current status filter
  // so we use a baseFilter (just dates) for the cards
  let baseFilter = {};
  if (from && to) {
    baseFilter.createdAt = filter.createdAt;
  }

  const stats = {
    total: await Lead.countDocuments(baseFilter),
    new: await Lead.countDocuments({ ...baseFilter, status: "New" }),
    contacted: await Lead.countDocuments({
      ...baseFilter,
      status: "Contacted",
    }),
    interested: await Lead.countDocuments({
      ...baseFilter,
      status: "Interested",
    }),
    notInterested: await Lead.countDocuments({
      ...baseFilter,
      status: "Not Interested",
    }),
    followUp: await Lead.countDocuments({ ...baseFilter, status: "Follow-up" }),
  };

  res.render("admin/leads", {
    leads,
    currentPage: page,
    totalPages,
    totalRecords,
    from,
    to,
    toast,
    stats,
    currentStatus: statusFilter, // Pass this to the view to highlight active card
  });
});

// Update Lead Status
router.post("/leads/:id", auth, async (req, res) => {
  await Lead.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
  });

  res.redirect("/admin/leads?toast=updated");
});

// Delete Lead
router.post("/leads/delete/:id", auth, async (req, res) => {
  await Lead.findByIdAndDelete(req.params.id);
  res.redirect("/admin/leads?toast=deleted");
});

// CSV Export
router.get("/leads/export/csv", auth, async (req, res) => {
  const from = req.query.from || "";
  const to = req.query.to || "";

  let filter = {};

  if (from && to) {
    filter.createdAt = {
      $gte: new Date(from + "T00:00:00"),
      $lte: new Date(to + "T23:59:59"),
    };
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();

  let csv = "Name,Phone,Model,Variant,Source,Status,Date & Time\n";

  leads.forEach((lead) => {
    const dateTime = new Date(lead.createdAt).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    csv += `"${lead.name}","${lead.phone}","${lead.modelName}","${lead.variantName}","${lead.source}","${lead.status}","${dateTime}"\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("website_leads.csv");
  res.send(csv);
});

// ===============================
// CONTACT US MANAGEMENT
// ===============================

// All Contact Messages + Filter + Pagination
router.get("/contact-us", auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const from = req.query.from || "";
  const to = req.query.to || "";
  const toast = req.query.toast || "";
  const statusFilter = req.query.status || "";

  let filter = {};

  if (from && to) {
    filter.createdAt = {
      $gte: new Date(from + "T00:00:00"),
      $lte: new Date(to + "T23:59:59"),
    };
  }

  if (statusFilter) {
    filter.status = statusFilter;
  }

  const totalRecords = await Contact.countDocuments(filter);
  const totalPages = Math.ceil(totalRecords / limit);

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  let baseFilter = {};
  if (from && to) {
    baseFilter.createdAt = filter.createdAt;
  }

  const stats = {
    total: await Contact.countDocuments(baseFilter),
    new: await Contact.countDocuments({ ...baseFilter, status: "new" }),
    contacted: await Contact.countDocuments({
      ...baseFilter,
      status: "contacted",
    }),
    closed: await Contact.countDocuments({
      ...baseFilter,
      status: "closed",
    }),
  };

  res.render("admin/contact-us", {
    contacts,
    currentPage: page,
    totalPages,
    totalRecords,
    from,
    to,
    toast,
    stats,
    currentStatus: statusFilter,
  });
});

// Update Contact Status
router.post("/contact-us/:id", auth, async (req, res) => {
  await Contact.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
  });

  res.redirect("/admin/contact-us?toast=updated");
});

// Delete Contact Message
router.post("/contact-us/delete/:id", auth, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.redirect("/admin/contact-us?toast=deleted");
});

module.exports = router;
