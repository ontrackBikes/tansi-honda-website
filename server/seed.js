const mongoose = require("mongoose");
require("dotenv").config();

const Bike = require("./models/bike.model");

// 👉 paste your JSON here OR require file
const data = require("../data/bikes.json"); // create this file

// helper to generate slug
const generateSlug = (name) =>
  name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("DB Connected");

    // optional: clear existing
    await Bike.deleteMany();
    console.log("Old data removed");

    const formatted = data.map(item => ({
      name: item.name,
      slug: generateSlug(item.name),
      category: item.category,
      image: item.image,
      description: item.description || "",
      features: item.features || [],
      specs: {
        engine: item.engine,
        mileage: item.mileage,
        power: item.power,
        torque: item.torque,
        fuel_type: item.fuel_type,
        transmission: item.transmission
      },
      isActive: true
    }));

    await Bike.insertMany(formatted);

    console.log("✅ Data inserted successfully");
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();