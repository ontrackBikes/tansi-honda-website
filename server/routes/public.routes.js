const express = require("express");
const axios = require("axios");
const router = express.Router();
const Bike = require("../models/bike.model");
const Service = require("../models/service.model");
const Lead = require("../models/lead.model");

const allowedCategories = ["motorcycle", "scooter", "e2w"];

// ================= HOME =================
router.get("/", async (req, res) => {
  const models = await Bike.find({ isActive: true }).limit(6);
  res.render("website/home", { models });
});

// ================= STATIC PAGES =================
router.get("/spare-parts-query", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/spare-parts-query", { models });
});

router.get("/apply-insurance", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/apply-insurance", { models });
});

router.get("/book-service", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/book-service", { models });
});

router.get("/apply-for-a-loan", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/apply-for-a-loan", { models });
});

router.get("/about-us", (req, res) => {
  res.render("website/about-us");
});

router.get("/contact-us", (req, res) => {
  res.render("website/contact-us");
});

router.get("/special-offer", async (req, res) => {
  const models = await Bike.find({ isActive: true }).limit(6);
  res.render("website/special-offer", { models });
});

router.get("/tansi-honda-assistance", (req, res) => {
  res.render("website/tansi-honda-assistance");
});

router.get("/directions", (req, res) => {
  res.render("website/directions");
});

router.get("/quick-quote", (req, res) => {
  res.render("website/quick-quote");
});

router.get("/buy-honda-from-home", (req, res) => {
  res.render("website/buy-honda-from-home");
});

router.get("/service/success", (req, res) => {
  res.render("website/service-success");
});

// ================= ALL MODELS (IMPORTANT: BEFORE /:category) =================
router.get("/models", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/models", {
    models,
    currentCategory: "All",
  });
});

// ================= CATEGORY =================
router.get("/:category", async (req, res) => {
  const { category } = req.params;

  if (!allowedCategories.includes(category)) {
    return res.status(404).render("website/404");
  }

  const models = await Bike.find({ isActive: true, category });

  res.render("website/models", {
    models,
    currentCategory: category,
  });
});

// ================= MODEL DETAIL =================
router.get("/:category/:slug", async (req, res) => {
  const { category, slug } = req.params;

  if (!allowedCategories.includes(category)) {
    return res.status(404).render("website/404");
  }

  const model = await Bike.findOne({ slug, category });

  if (!model) {
    return res.status(404).render("website/404");
  }

  res.render("website/model-detail", { model });
});

// BOOK SERVICE APPOINTMENT
router.post("/create-appointment", async (req, res) => {
  try {
    await Service.create(req.body);
    // ✅ redirect to success page
    res.redirect("/service/success");
  } catch (err) {
    console.error(err);
    res.send("Error submitting request");
  }
});

// Tip: In production, use environment variables for secrets
const BHASH_USER = process.env.BHASH_USER;
const BHASH_PASS = process.env.BHASH_PASS;
const BHASH_SENDER = process.env.BHASH_SENDER;

const formatINR = (num) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);

router.post("/leads", async (req, res) => {
  try {
    const { name, email, phone, modelName, variantName, source } = req.body;

    if (!name || !phone || !modelName) {
      console.warn(`⚠️  [Lead Blocked] Missing fields from IP: ${req.ip}`);
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const bike = await Bike.findOne({ name: modelName }).lean();
    if (!bike) {
      console.error(
        `❌ [Data Error] Bike model "${modelName}" not found in database.`,
      );
      return res.status(404).json({ success: false });
    }

    const variant =
      bike.variants.find((v) => v.name === variantName) || bike.variants[0];

    // 1. Save Lead
    const newLead = new Lead({
      name: name.trim(),
      email: email?.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ""),
      modelName: bike.name,
      variantName: variant.name,
      source: source || "Website Inquiry",
    });
    await newLead.save();

    // 🚀 LOG: Lead Saved Successfully
    console.log(
      `✅ [New Lead Saved] ${newLead.name} | ${newLead.modelName} (${newLead.variantName}) | Source: ${newLead.source}`,
    );

    // 2. Immediate Response
    res.status(200).json({ success: true, message: "Sent! Check WhatsApp." });

    // 3. Background WhatsApp Logic
    (async () => {
      try {
        const cleanPhone = newLead.phone.slice(-10);
        let bhashParams = {
          user: process.env.BHASH_USER,
          pass: process.env.BHASH_PASS,
          sender: process.env.BHASH_SENDER,
          phone: cleanPhone,
          priority: "wa",
          stype: "normal",
        };

        if (source === "Download Brochure") {
          bhashParams.text = "tansi_model_brochure_share";
          bhashParams.Params = `${newLead.name},${bike.name},${bike.brochure}`;
          bhashParams.htype = "image";
          bhashParams.url = bike.coverImage;
        } else {
          bhashParams.text = "tansi_vehicle_price_quote";
          bhashParams.Params = [
            newLead.name,
            bike.name,
            variant.name,
            formatINR(variant.price.exShowroom),
            formatINR(variant.price.roadTaxAndReg),
            formatINR(variant.price.insuranceBase),
            formatINR(variant.price.finalOnRoad),
          ].join(",");
          bhashParams.htype = "image";
          bhashParams.url = bike.coverImage;
        }

        const response = await axios.get(
          `http://bhashsms.com/api/sendmsg.php`,
          { params: bhashParams },
        );

        // 🚀 LOG: WhatsApp API Response
        console.log(
          `📲 [WhatsApp Sent] To: ${cleanPhone} | Template: ${bhashParams.text} | Provider Response: ${JSON.stringify(response.data)}`,
        );
      } catch (err) {
        console.error(
          `📡 [WhatsApp API Failed] Lead: ${newLead.name} (${cleanPhone}) | Error: ${err.message}`,
        );
      }
    })();
  } catch (err) {
    console.error("🔥 [Critical Lead Route Error]:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
