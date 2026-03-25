const mongoose = require("mongoose");

const bikeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  slug: {
    type: String,
    unique: true
  },

  category: {
    type: String, // Scooter / Bike / Touring
  },

  price: {
    type: String // optional (you said not needed now)
  },

  image: {
    type: String
  },

  images: [
    {
      type: String // for future gallery support
    }
  ],

  description: {
    type: String
  },

  features: [
    {
      type: String
    }
  ],

  // 🔧 Specifications
  specs: {
    engine: String,
    mileage: String,
    power: String,
    torque: String,
    fuel_type: String,
    transmission: String
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Bike", bikeSchema);