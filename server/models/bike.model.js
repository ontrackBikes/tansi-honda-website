const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    show: { type: Boolean, default: false },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const bikeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },

    category: {
      type: String,
      enum: ["motorcycle", "scooter", "e2w"],
      required: true,
    },

    subCategory: {
      type: String,
      enum: ["RedWing", "BigWing", null],
      default: null,
    },

    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    brochure: { type: String, default: "" },
    isActive: { type: Boolean, default: true },

    colors: [
      {
        name: String,
        code: String,
        image: String,
      },
    ],

    features: {
      safety: sectionSchema,
      comfort: sectionSchema,
      design: sectionSchema,
      technology: sectionSchema,
    },

    variants: [
      {
        name: String,
        sku: String,

        price: {
          exShowroom: { type: Number, required: true },
          roadTaxAndReg: { type: Number }, // Road tax + Registration + Smart Card
          insuranceBase: { type: Number }, // Optional 5 year (OD) + 1 year (PA)
          onRoadBase: { type: Number }, // Base On-Road Price
          zeroDepPremium: { type: Number }, // Added Insurance Premium for 0% Dep
          finalOnRoad: { type: Number }, // On Road Price with 0% Dep
          currency: { type: String, default: "INR" },
        },

        specs: {
          performance: sectionSchema,
          body: sectionSchema,
          engine: sectionSchema,
          motor: sectionSchema,
          transmission: sectionSchema,
          tyres: sectionSchema,
          suspension: sectionSchema,
          electricals: sectionSchema,
          chassis: sectionSchema,
          battery_and_charging: sectionSchema,
          connectivity_features: sectionSchema,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bike", bikeSchema);
