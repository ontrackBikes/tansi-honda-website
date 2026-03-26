const mongoose = require("mongoose");

const bikeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },

  category: { 
    type: String, 
    enum: ["motorcycle", "scooter", "e2w"], 
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

  colors: [
    {
      name: { type: String, trim: true },
      code: { type: String, trim: true },
      image: { type: String }
    }
  ],

  features: {
    safety: [{ title: String, image: String, description: String }],
    comfort: [{ title: String, image: String, description: String }],
    design: [{ title: String, image: String, description: String }],
    technology: [{ title: String, image: String, description: String }]
  },

  variants: [
    {
      name: { type: String, trim: true },
      sku: { type: String, trim: true },
      specs: {
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
        engine: {
          type: { type: String },
          displacement: String,
          power: String,
          torque: String,
          fuel_system: String,
          bore_stroke: String,
          compression_ratio: String,
          starting: String
        },
        transmission: { clutch: String, gears: String },
        tyres: { front: String, rear: String, front_brake: String, rear_brake: String },
        suspension: { frame: String, front: String, rear: String },
        electricals: { battery: String, headlamp: String }
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Bike", bikeSchema);