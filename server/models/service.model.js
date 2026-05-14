const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },

    model: { type: String, required: true },

    serviceCentre: {
      type: String,
      required: true,
    },

    pickupDrop: {
      type: Boolean,
      default: false,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    preferredDate: { type: Date },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
