const mongoose = require("mongoose");
require("dotenv").config();

const Bike = require("./models/bike.model");
const data = require("../data/bikes.json");

// slug helper
const generateSlug = (name) =>
  name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

// 🔥 ensure object (fixes your exact error)
const ensureObject = (val) => {
  if (!val) return {};
  if (typeof val === "object") return val;
  return {}; // if string/invalid → prevent crash
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    await Bike.deleteMany();
    console.log("Old data removed");

    const formatted = data.map(item => ({
      name: item.name,
      slug: item.slug || generateSlug(item.name),

      category: item.category,
      subCategory: item.subCategory || null,

      description: item.description || "",

      coverImage: item.coverImage || item.image || "",

      brochure: item.brochure || "",

      isActive: true,

      // 🎨 COLORS
      colors: Array.isArray(item.colors) ? item.colors : [],

      // 🧩 FEATURES
      features: {
        safety: item.features?.safety || [],
        comfort: item.features?.comfort || [],
        design: item.features?.design || [],
        technology: item.features?.technology || []
      },

      // 🔥 VARIANTS
      variants: (item.variants || []).map(v => ({
        name: v.name || "",
        sku: v.sku || "",

        specs: {
          body: ensureObject(v.specs?.body),
          engine: ensureObject(v.specs?.engine),   // ✅ FIXED HERE
          transmission: ensureObject(v.specs?.transmission),
          tyres: ensureObject(v.specs?.tyres),
          suspension: ensureObject(v.specs?.suspension),
          electricals: ensureObject(v.specs?.electricals)
        }
      }))
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