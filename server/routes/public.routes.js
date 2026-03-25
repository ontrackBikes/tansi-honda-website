const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");

// Home
router.get("/", async (req, res) => {
  const models = await Bike.find({ isActive: true }).limit(6);
  res.render("website/home", { models });
});

// All Models
router.get("/models", async (req, res) => {
  const models = await Bike.find({ isActive: true });
  res.render("website/models", { models });
});

// Model Detail
router.get("/models/:id", async (req, res) => {
  const model = await Bike.findById(req.params.id);
  res.render("website/model-detail", { model });
});

module.exports = router;