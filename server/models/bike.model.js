const mongoose = require("mongoose");

const bikeSchema = new mongoose.Schema({

  // 🔹 BASIC INFO
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },

  category: { 
    type: String, 
    enum: ["EV", "Scooter", "Motorcycle"], 
    required: true 
  },

  subCategory: { 
    type: String, 
    enum: ["RedWing", "BigWing", null],
    default: null
  },

  description: { type: String, default: "" },


  coverImage: { type: String, default: "" },

  brochure: { type: String, default: "" },

  isActive: { type: Boolean, default: true },

  // 🎨 COLORS
  colors: [
    {
      name: { type: String, trim: true },
      code: { type: String, trim: true },
      image: { type: String }
    }
  ],

  // 🧩 FEATURES
  features: {
    safety: [
      {
        title: String,
        image: String,
        description: String
      }
    ],
    comfort: [
      {
        title: String,
        image: String,
        description: String
      }
    ],
    design: [
      {
        title: String,
        image: String,
        description: String
      }
    ],
    technology: [
      {
        title: String,
        image: String,
        description: String
      }
    ]
  },

  // 🔥 VARIANTS
  variants: [
    {
      name: { type: String, trim: true },
      sku: { type: String, trim: true },

      specs: {

        // 🧱 BODY
        body: {
          length: String,
          width: String,
          height: String,
          wheelbase: String,
          ground_clearance: String,
          kerb_weight: String,
          seat_length: String,
          seat_height: String,
          fuel_tank: String
        },

        // ⚙️ ENGINE
        engine: {
          type: {
            type: String,
          },
          displacement: String,
          power: String,
          torque: String,
          fuel_system: String,
          bore_stroke: String,
          compression_ratio: String,
          starting: String
        },

        // ⚙️ TRANSMISSION
        transmission: {
          clutch: String,
          gears: String
        },

        // 🛞 TYRES & BRAKES
        tyres: {
          front: String,
          rear: String,
          front_brake: String,
          rear_brake: String
        },

        // 🏍️ SUSPENSION
        suspension: {
          frame: String,
          front: String,
          rear: String
        },

        // 🔋 ELECTRICALS
        electricals: {
          battery: String,
          headlamp: String
        }

      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Bike", bikeSchema);