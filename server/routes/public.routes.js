const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");

const allowedCategories = ["motorcycle", "scooter", "e2w"];

// Home page
router.get("/", async (req, res) => {
  const models = await Bike.find({ isActive: true }).limit(6);
  res.render("website/home", { models });
});

router.get("/spare-parts-query", async (req, res) => {
  const models = await Bike.find({ isActive: true }); // optional if needed
  res.render("website/spare-parts-query", { models });
});

router.get("/apply-insurance", async (req, res) => {
  const models = await Bike.find({ isActive: true }); // optional if needed
  res.render("website/apply-insurance", { models });
});

router.get("/book-service", async (req, res) => {
  const models = await Bike.find({ isActive: true }); // optional if needed
  res.render("website/book-service", { models });
});

router.get("/apply-for-a-loan", async (req, res) => {
  const models = await Bike.find({ isActive: true }); // optional if needed
  res.render("website/apply-for-a-loan", { models });
});

router.get("/about-us", async (req, res) => {
  res.render("website/about-us");
});

router.get("/contact-us", async (req, res) => {
  res.render("website/contact-us");
});

router.get("/directions", async (req, res) => {
  res.render("website/directions");
});

// Category page
router.get("/:category", async (req, res) => {
  const { category } = req.params;

  if (!allowedCategories.includes(category)) {
    return res.status(404).render("website/404");
  }

  const models = await Bike.find({ isActive: true, category });
  res.render("website/models", { models, currentCategory: category });
});

// Model detail page
router.get("/:category/:slug", async (req, res) => {
  const { category, slug } = req.params;

  if (!allowedCategories.includes(category)) {
    return res.status(404).render("website/404");
  }

  const model = await Bike.findOne({ slug, category });

  if (!model) return res.status(404).render("website/404");

  res.render("website/model-detail", { model });
});

module.exports = router;
