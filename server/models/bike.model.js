const mongoose = require("mongoose");

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
        name: { type: String, trim: true },
        code: { type: String, trim: true },
        image: { type: String },
      },
    ],

    features: {
      safety: [{ title: String, image: String, description: String }],
      comfort: [{ title: String, image: String, description: String }],
      design: [{ title: String, image: String, description: String }],
      technology: [{ title: String, image: String, description: String }],
    },

    variants: [
      {
        name: { type: String, trim: true },
        sku: { type: String, trim: true },
        specs: {
          performance: {
            // for ev
            range: String,
            acceleration: String,
            top_speed: String,
          },
          body: {
            length: String,
            width: String,
            height: String,
            wheelbase: String,
            ground_clearance: String,
            kerb_weight: String,
            seat_length: String,
            seat_height: String,
            fuel_tank: String,
            // for ev
            weight: String,
            glove_box_capacity: String,
          },
          engine: {
            type: { type: String },
            displacement: String,
            power: String,
            torque: String,
            fuel_system: String,
            bore_stroke: String,
            compression_ratio: String,
            starting: String,
          },
          motor: {
            // for ev
            type: { type: String },
            max_power: String,
            max_torque: String,
            battery_capacity: String,
            range: String,
            charging_time: String,
          },
          transmission: { clutch: String, gears: String },
          tyres: {
            front: String,
            rear: String,
            front_brake: String,
            rear_brake: String,
          },
          suspension: { frame: String, front: String, rear: String },
          electricals: { battery: String, headlamp: String },
          chassis: { 
            type: String,
            material: String,
            frame_type: String,
            wheel_type: String,
            front_tyre_size: String,
            rear_tyre_size: String,
            tyre_type: String,
            braking_system: String,
            front_brake: String,
            rear_brake: String,
            front_suspension: String,
            rear_suspension: String,
          },
          battery_and_charging: {
            battery_system: String,
            battery_type: String,
            battery_capacity: String,
            battery_water_and_dust_resistance: String,
            charging_time: String,
          },
          connecttivity_features: {
            connectivity_app: String,
            display: String,
            connectivity: String,
            smartphone_integration: String,
            navigation: String,
            live_tracking: String,
            call_and_music_control: String,
          },
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bike", bikeSchema);
