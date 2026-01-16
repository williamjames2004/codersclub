const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({

  /* =========================
     AUTHENTICATION & IDENTITY
     ========================= */

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
  },

  profession: {
    type: String,
    enum: ["student", "professor"],
    required: true
  },

  /* =========================
     COMMON ADMIN INFO
     ========================= */

  officialEmail: {
    type: String
  },

  officialContact: {
    type: String
  },

  profileImage: {
    type: String
  },

  status: {
    type: String,
    enum: ["Active", "Inactive", "Suspended"],
    default: "Active"
  },

  appointedDate: {
    type: Date
  },

  tenureEndDate: {
    type: Date
  },

  /* =========================
     STUDENT ADMIN PROFILE
     ========================= */

  studentAdminProfile: {

    registerNumber: String,
    department: String,
    year: {
      type: Number,
      min: 1,
      max: 4
    },

    roleInClub: String,

    responsibilities: [String],

    authorityLevel: {
      type: Number,
      min: 1,
      max: 10
    },

    availability: String
  },

  /* =========================
     PROFESSOR ADMIN PROFILE
     ========================= */

  professorAdminProfile: {

    staffId: String,
    department: String,
    designation: String,

    roleInClub: String,

    responsibilities: [String],

    authorityLevel: {
      type: Number,
      min: 1,
      max: 10
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Admin", adminSchema);
