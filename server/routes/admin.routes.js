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
  try {
    const { name, price, image, description, features, isActive } = req.body;

    await Bike.findByIdAndUpdate(req.params.id, {
      name,
      price,
      image,
      description,
      features: features ? features.split(",").map(f => f.trim()) : [],
      isActive: isActive === "on"
    });

    res.redirect("/admin");

  } catch (err) {
    console.error(err);
    res.send("Error updating model");
  }
});


const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const upload = require("../middleware/upload");

// Upload Image API
router.post("/upload-image", upload.single("image"), async (req, res) => {
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
      url: `/images/${filename}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;