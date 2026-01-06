const mongoose = require("mongoose");

const dashboardSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  attempted_quizzes: [
    {
      quiz_id: String,
      quiz_name: String,
      total_points: Number,
      points_obtained: Number,
      percentage: Number
    }
  ],
  ratings: Number
});

module.exports = mongoose.model("Dashboard", dashboardSchema);