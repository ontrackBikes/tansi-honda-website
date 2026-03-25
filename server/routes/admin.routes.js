const express = require("express");
const router = express.Router();
const Bike = require("../models/bike.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");


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
    expiresIn: "1d"
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

// Add Model Page
router.get("/add", auth, (req, res) => {
  res.render("admin/add-model");
});

// Create Model
// Create Model
router.post("/add", auth, async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      image,
      description,
      features,
      engine,
      mileage,
      power,
      torque,
      fuel_type,
      transmission
    } = req.body;

    const slug = name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    await Bike.create({
      name,
      slug,
      category,
      price,
      image,
      description,
      features: features
        ? features.split(",").map(f => f.trim())
        : [],
      specs: {
        engine,
        mileage,
        power,
        torque,
        fuel_type,
        transmission
      }
    });

    res.redirect("/admin");

  } catch (err) {
    console.error(err);
    res.send("Error adding model");
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
    const {
      name,
      category,
      price,
      image,
      description,
      features,
      engine,
      mileage,
      power,
      torque,
      fuel_type,
      transmission,
      isActive
    } = req.body;

    const slug = name
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    await Bike.findByIdAndUpdate(req.params.id, {
      name,
      slug,
      category,
      price,
      image,
      description,
      features: features
        ? features.split(",").map(f => f.trim())
        : [],
      specs: {
        engine,
        mileage,
        power,
        torque,
        fuel_type,
        transmission
      },
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
      url: `/images/${filename}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;