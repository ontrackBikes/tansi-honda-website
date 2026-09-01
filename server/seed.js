const mongoose = require("mongoose");
require("dotenv").config();

const Bike = require("./models/bike.model");
const data = require("../data/bikes.json");

// 🔹 slug helper
const generateSlug = (name) =>
  name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");

// 🔹 ensure object
const ensureObject = (val) => {
  if (!val) return {};
  if (typeof val === "object") return val;
  return {};
};

// 🔹 convert object → [{ key: value }]
const objectToKeyValueArray = (obj) => {
  if (!obj || typeof obj !== "object") return [];

  return Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([key, value]) => ({
      [key]: value,
    }));
};

// 🔹 build section from object (for specs)
const buildSectionFromObject = (input) => {
  const obj = ensureObject(input);
  const items = objectToKeyValueArray(obj);

  return {
    show: items.length > 0,
    items,
  };
};

// 🔹 build section from array (for features)
const buildSectionFromArray = (arr) => {
  const items = Array.isArray(arr) ? arr : [];

  return {
    show: items.length > 0,
    items,
  };
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    await Bike.deleteMany();
    console.log("Old data removed");

    const formatted = data.map((item) => ({
      name: item.name,
      slug: item.slug || generateSlug(item.name),

      category: item.category,
      subCategory: item.subCategory || null,

      description: item.description || "",
      coverImage: item.coverImage || item.image || "",
      brochure: item.brochure || "",
      isActive: true,
      bookingsOpen: item.bookingsOpen === true,

      colors: Array.isArray(item.colors) ? item.colors : [],

      // 🔥 FEATURES (converted to show + items)
      features: {
        safety: buildSectionFromArray(item.features?.safety),
        comfort: buildSectionFromArray(item.features?.comfort),
        design: buildSectionFromArray(item.features?.design),
        technology: buildSectionFromArray(item.features?.technology),
      },

      // 🔥 VARIANTS
      variants: (item.variants || []).map((v) => ({
        name: v.name || "",
        sku: v.sku || "",

        price: {
          exShowroom: Number(v.price?.exShowroom) || 0,
          roadTaxAndReg: Number(v.price?.roadTaxAndReg) || 0,
          insuranceBase: Number(v.price?.insuranceBase) || 0,
          onRoadBase: Number(v.price?.onRoadBase) || 0,
          zeroDepPremium: Number(v.price?.zeroDepPremium) || 0,
          finalOnRoad: Number(v.price?.finalOnRoad) || 0,
          currency: v.price?.currency || "INR",
        },

        specs: {
          performance: buildSectionFromObject(v.specs?.performance),
          body: buildSectionFromObject(v.specs?.body),
          engine: buildSectionFromObject(v.specs?.engine),
          motor: buildSectionFromObject(v.specs?.motor),
          transmission: buildSectionFromObject(v.specs?.transmission),
          tyres: buildSectionFromObject(v.specs?.tyres),
          suspension: buildSectionFromObject(v.specs?.suspension),
          electricals: buildSectionFromObject(v.specs?.electricals),
          chassis: buildSectionFromObject(v.specs?.chassis),
          battery_and_charging: buildSectionFromObject(
            v.specs?.battery_and_charging,
          ),
          connectivity_features: buildSectionFromObject(
            v.specs?.connectivity_features,
          ),
        },
      })),
    }));

    await Bike.insertMany(formatted);

    console.log("✅ Data inserted successfully");
    process.exit();
  } catch (err) {
    console.error("❌ SEED ERROR:", err.message);
    process.exit(1);
  }
};

seedData();
