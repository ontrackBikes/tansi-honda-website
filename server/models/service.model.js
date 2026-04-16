const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },

    model: { type: String, required: true },

    serviceCentre: {
      type: String,
      enum: ["Bangalore Central", "Bangalore East", "Bangalore West"],
      required: true,
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
