const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    modelName: { type: String, required: true },
    variantName: { type: String },
    source: {
      type: String,
      enum: ["Get Price", "Download Brochure", "Quick Quote"],
      default: "Get Price",
    },
    status: { type: String, default: "New" }, // New, Contacted, Interested, Not Interested, Follow-up
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lead", leadSchema);
