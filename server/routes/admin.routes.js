const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");

// Dashboard
router.get("/", async (req, res) => {
  const models = await Bike.find();
  res.render("admin/dashboard", { models });
});

// Add Model Page
router.get("/add", (req, res) => {
  res.render("admin/add-model");
});

// Create Model
router.post("/add", async (req, res) => {
  try {
    const { name, price, image, description, features } = req.body;

    await Bike.create({
      name,
      price,
      image,
      description,
      features: features ? features.split(",").map(f => f.trim()) : []
    });

    res.redirect("/admin");

  } catch (err) {
    console.error(err);
    res.send("Error adding model");
  }
});

// Edit Page
router.get("/edit/:id", async (req, res) => {
  const model = await Bike.findById(req.params.id);
  res.render("admin/edit-model", { model });
});

// Update Model
router.post("/edit/:id", async (req, res) => {
  const { name, price, image, description, features, isActive } = req.body;

  await Bike.findByIdAndUpdate(req.params.id, {
    name,
    price,
    image,
    description,
    features: features.split(","),
    isActive: isActive === "on"
  });

  res.redirect("/admin");
});

module.exports = router;