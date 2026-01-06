const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  admin_id: { type: String, unique: true },
  name: String,
  password: String
});

module.exports = mongoose.model("Admin", adminSchema);