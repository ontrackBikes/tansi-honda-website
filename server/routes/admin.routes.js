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
      transmission,
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
      features: features ? features.split(",").map((f) => f.trim()) : [],
      specs: {
        engine,
        mileage,
        power,
        torque,
        fuel_type,
        transmission,
      },
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
      isActive,
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
      features: features ? features.split(",").map((f) => f.trim()) : [],
      specs: {
        engine,
        mileage,
        power,
        torque,
        fuel_type,
        transmission,
      },
      isActive: isActive === "on",
    });

    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.send("Error updating model");
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
  const services = await Service.find().sort({ createdAt: -1 });
  res.render("admin/services", { services });
});

// UPDATE STATUS - SERVICES
router.post("/services/:id", auth, async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
  });
  res.redirect("/admin/services");
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
