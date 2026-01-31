const mongoose = require("mongoose");

const buzzerResultSchema = new mongoose.Schema(
  {
    game_id: { type: String, required: true },
    qtn_id: { type: String, required: true },

    first_submission: String,
    first_result: { type: String, enum: ["CORRECT", "WRONG"] },

    second_submission: String,
    second_result: { type: String, enum: ["CORRECT", "WRONG"] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuzzerResult", buzzerResultSchema);