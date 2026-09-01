const mongoose = require("mongoose");

exports.connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ DB Connected Successfully");
    return true;
  } catch (error) {
    console.error("❌ DB Connection Failed");
    console.error(error.message);
    return false;
  }
};
