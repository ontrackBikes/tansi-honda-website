const express = require("express");
const axios = require("axios");
const router = express.Router();
const Bike = require("../models/bike.model");
const Service = require("../models/service.model");
const Lead = require("../models/lead.model");
const Contact = require("../models/contact.model");

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

// ================= Contact Us =================

router.get("/contact-us", (req, res) => {
  res.render("website/contact-us");
});

router.get("/contact-success", (req, res) => {
  res.render("website/contact-success");
});

router.post("/submit-contact", async (req, res) => {
  try {
    const { fullName, phone, email, subject, message } = req.body;

    await Contact.create({
      fullName,
      phone,
      email,
      subject,
      message,
    });

    res.redirect("/contact-success");
  } catch (err) {
    console.log("Contact Form Error:", err);
    res.redirect("/contact-us");
  }
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

// Tip: In production, use environment variables for secrets
const BHASH_USER = process.env.BHASH_USER;
const BHASH_PASS = process.env.BHASH_PASS;
const BHASH_SENDER = process.env.BHASH_SENDER;

// BOOK SERVICE APPOINTMENT
router.post("/create-appointment", async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      model,
      serviceCentre,
      preferredDate,
      pickupDrop,
      address,
    } = req.body;

    // =========================
    // CLEAN VALUES
    // =========================
    const cleanName = name?.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanMobile = mobile?.replace(/\D/g, "");
    const cleanModel = model?.trim();

    const isPickupDrop =
      pickupDrop === true || pickupDrop === "true" || pickupDrop === "on";

    const cleanAddress = address
      ? address.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, 150)
      : "";

    // =========================
    // DATE VALIDATION
    // =========================
    const selectedDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (selectedDate < tomorrow) {
      return res.status(400).send("Same day booking is not allowed");
    }

    // =========================
    // BASIC VALIDATION
    // =========================
    if (
      !cleanName ||
      !cleanEmail ||
      !cleanMobile ||
      !cleanModel ||
      !preferredDate
    ) {
      return res.status(400).send("Required fields missing");
    }

    // =========================
    // PICKUP VALIDATION
    // =========================
    if (isPickupDrop && !cleanAddress) {
      return res.status(400).send("Pickup address is required");
    }

    // =========================
    // SERVICE CENTRE VALIDATION
    // =========================
    if (!isPickupDrop && !serviceCentre) {
      return res.status(400).send("Service centre is required");
    }

    // =========================
    // SAVE BOOKING
    // =========================
    const appointment = await Service.create({
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      model: cleanModel,
      preferredDate,
      pickupDrop: isPickupDrop,
      address: cleanAddress,
      serviceCentre: isPickupDrop ? "Pickup & Drop" : serviceCentre,
    });

    console.log(
      `✅ [Service Appointment] ${appointment.name} | ${appointment.model}`,
    );

    // FAST RESPONSE
    res.redirect("/service/success");

    // =========================
    // WHATSAPP MESSAGE
    // =========================
    (async () => {
      try {
        const cleanPhone = `91${appointment.mobile.slice(-10)}`;

        // FORMAT DATE
        const bookingDate = new Date(preferredDate).toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        );

        // =========================
        // TEMPLATE SELECTION
        // =========================
        const bhashParams = isPickupDrop
          ? {
              user: BHASH_USER,
              pass: BHASH_PASS,
              sender: BHASH_SENDER,
              phone: cleanPhone,
              priority: "wa",
              stype: "normal",
              text: "tansi_service_pickup_booking",

              Params: [
                appointment.name,
                appointment.model,
                bookingDate,
                cleanAddress,
              ].join(","),
            }
          : {
              user: BHASH_USER,
              pass: BHASH_PASS,
              sender: BHASH_SENDER,
              phone: cleanPhone,
              priority: "wa",
              stype: "normal",
              text: "tansi_service_booking_confirmation",

              Params: [
                appointment.name,
                appointment.model,
                appointment.serviceCentre,
                bookingDate,
              ].join(","),
            };

        console.log("📤 WhatsApp Params:", bhashParams);

        // SEND WHATSAPP
        const response = await axios.get(
          "http://bhashsms.com/api/sendmsgutil.php",
          {
            params: bhashParams,
            timeout: 20000,
          },
        );

        const resData = response.data.toString().trim();

        console.log("📥 WhatsApp Response:", resData);

        if (resData.startsWith("S.")) {
          console.log(`✅ [WhatsApp Sent] Sent to ${cleanPhone}`);
        } else {
          console.warn(`⚠️ [WhatsApp Warning] ${resData}`);
        }
      } catch (err) {
        console.error(`📡 [WhatsApp Failed] ${err.message}`);
      }
    })();
  } catch (err) {
    console.error("🔥 [Service Booking Error]:", err);

    res.status(500).send("Error submitting request");
  }
});

// const formatINR = (num) =>
//   new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);

const formatINRPlain = (num) => Math.round(num).toString();

router.post("/leads", async (req, res) => {
  try {
    const { name, email, phone, modelName, variantName, source } = req.body;

    if (!name || !phone || !modelName) {
      console.warn(`⚠️ [Lead Blocked] Missing fields from IP: ${req.ip}`);

      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    // Find bike
    const bike = await Bike.findOne({ name: modelName }).lean();

    if (!bike) {
      console.error(
        `❌ [Data Error] Bike model "${modelName}" not found in database.`,
      );

      return res.status(404).json({
        success: false,
        message: "Bike not found",
      });
    }

    // Find variant
    const variant =
      bike.variants.find((v) => v.name === variantName) || bike.variants[0];

    // Save lead
    const newLead = new Lead({
      name: name.trim(),
      // email: email?.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ""),
      modelName: bike.name,
      variantName: variant.name,
      source: source || "Website Inquiry",
    });

    await newLead.save();

    console.log(
      `✅ [New Lead Saved] ${newLead.name} | ${newLead.modelName} (${newLead.variantName}) | Source: ${newLead.source}`,
    );

    // Send immediate response
    res.status(200).json({
      success: true,
      message: "Sent! Check WhatsApp.",
    });

    // Background WhatsApp sending
    (async () => {
      try {
        // BhashSMS format:
        // number without 91 + trailing comma
        const cleanPhone = `${newLead.phone.slice(-10)}`;

        // Production URL
        const PROD_URL =
          "https://tansi-honda-website-production.up.railway.app";

        let imageUrl = bike.coverImage.trim();

        // If it's a relative path like /images/..., make it absolute
        if (imageUrl.startsWith("/")) {
          imageUrl = `${PROD_URL}${imageUrl}`;
        }

        // WhatsApp params
        let bhashParams = {
          user: BHASH_USER,
          pass: BHASH_PASS,
          sender: BHASH_SENDER,
          phone: cleanPhone,
          priority: "wa",
          stype: "normal",
          htype: "image",
          url: imageUrl,
        };

        // Brochure template
        if (source === "Download Brochure") {
          bhashParams.text = "tansi_model_brochure_share";

          bhashParams.Params = [newLead.name, bike.name, bike.brochure].join(
            ",",
          );
        }

        // Price quote template
        else {
          bhashParams.text = "tansi_vehicle_price_quote";

          bhashParams.Params = [
            newLead.name,
            bike.name,
            variant.name,
            formatINRPlain(variant.price.exShowroom),
            formatINRPlain(variant.price.roadTaxAndReg),
            formatINRPlain(variant.price.insuranceBase),
            formatINRPlain(variant.price.finalOnRoad),
          ].join(",");
        }

        // Debug logs
        // console.log("📤 WhatsApp Image URL:", imageUrl);

        // console.log("📤 WhatsApp Params:", bhashParams);

        // Send API request
        const response = await axios.get(
          "http://bhashsms.com/api/sendmsg.php",
          {
            params: bhashParams,
            timeout: 20000,
          },
        );

        const resData = response.data.toString().trim();

        console.log("📥 WhatsApp Response:", resData);

        // Success
        if (resData.startsWith("S.")) {
          console.log(
            `✅ [WhatsApp Delivered to Queue] ID: ${resData} | Number: ${cleanPhone}`,
          );
        }

        // Warning
        else {
          console.warn(`⚠️ [WhatsApp Provider Warning] Response: ${resData}`);
        }
      } catch (err) {
        console.error(`📡 [WhatsApp API Failed] Error: ${err.message}`);
      }
    })();
  } catch (err) {
    console.error("🔥 [Critical Lead Route Error]:", err);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
