const mongoose = require("mongoose");

const buzzerScoreSchema = new mongoose.Schema(
  {
    game_id: { type: String, required: true },
    user_id: { type: String, required: true },
    score: { type: Number, default: 0 }
  },
  { timestamps: true }
);

buzzerScoreSchema.index({ game_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model("BuzzerScore", buzzerScoreSchema);