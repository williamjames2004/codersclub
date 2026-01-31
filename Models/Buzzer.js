const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  qtn_id: { type: String, required: true },
  first_submission: { type: String, default: null },
  second_submission: { type: String, default: null },
  submissions: [String], // 👈 Track who already pressed
});

const buzzerSchema = new mongoose.Schema(
  {
    game_id: { type: String, required: true, unique: true },
    game_name: { type: String, required: true },
    password: { type: String, required: true },
    total_qtns: { type: Number, required: true },

    // Controlled only by admin
    global_active: { type: Boolean, default: true }, // 👈 ADMIN LOCK/UNLOCK

    qtns_array: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Buzzer", buzzerSchema);