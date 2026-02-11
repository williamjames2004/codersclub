const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  username: String,
  regno: { type: String },
  email: { type: String, unique: true },
  mobileno: String,
  department: String,
  password: String,
  plain_password: String,
  following: {
    type: [String],  // admin_id list
    default: []
  }
});

module.exports = mongoose.model("User", userSchema);
