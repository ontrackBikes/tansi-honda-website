const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");
const Service = require("../models/service.model");

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

module.exports = router;
