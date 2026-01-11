const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  admin_id: { 
    type: String, 
    unique: true, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  adminType: {
    type: String,
    enum: [
      "President",
      "VicePresident",
      "Secretary",
      "ViceSecretary",
      "Volunteer",
      "Professor",
      "Special",
      "Master",
      "Dev"
    ],
    required: true
  }
});

module.exports = mongoose.model("Admin", adminSchema);
