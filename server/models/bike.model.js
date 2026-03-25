const mongoose = require("mongoose");

const bikeSchema = new mongoose.Schema({
  name: String,
  price: String,
  image: String,
  description: String,
  features: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Bike", bikeSchema);