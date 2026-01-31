const mongoose = require("mongoose");

const adminPermissionSchema = new mongoose.Schema({
  admin_id: {
    type: String,
    required: true,
    unique: true
  },

  // --- QUIZ ---
  create_quiz: { type: Boolean, default: false },
  update_quiz: { type: Boolean, default: false },
  manage_quiz: { type: Boolean, default: false },

  // --- ADMIN / PROFILE ---
  change_password: { type: Boolean, default: false },
  update_profile: { type: Boolean, default: false },

  // --- DASHBOARD ---
  dashboard: { type: Boolean, default: false },

  // --- EVENTS ---
  add_event: { type: Boolean, default: false },
  update_event: { type: Boolean, default: false },

  // --- ACHIEVEMENTS ---
  add_achievement: { type: Boolean, default: false },
  update_achievement: { type: Boolean, default: false },

  // --- ADMINS ---
  create_admin: { type: Boolean, default: false },
  update_admins: { type: Boolean, default: false },

  // --- NEWS ---
  display_news: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("AdminPermission", adminPermissionSchema);