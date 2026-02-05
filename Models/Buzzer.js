const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  qtn_id: { type: String, required: true },
  first_submission: { type: String, default: null },
  second_submission: { type: String, default: null },
  submissions: [String],
});

const buzzerSchema = new mongoose.Schema(
  {
    game_id: { type: String, required: true, unique: true },
    game_name: { type: String, required: true },

    // 🔐 Access control
    password: { type: String, required: true },

    // 🕒 TIME (UTC for logic)
    start_time_utc: { type: Date, required: true },
    end_time_utc: { type: Date, required: true },

    // 🕒 TIME (IST for display)
    start_time_ist: { type: String, required: true },
    end_time_ist: { type: String, required: true },

    duration_minutes: { type: Number, required: true },
    total_qtns: { type: Number, required: true },

    // Admin control
    global_active: { type: Boolean, default: true },

    qtns_array: [questionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Buzzer", buzzerSchema);
