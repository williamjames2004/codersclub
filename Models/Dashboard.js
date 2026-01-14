const mongoose = require("mongoose");

const dashboardSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  attempted_quizzes: [
    {
      quiz_id: String,
      quiz_name: String,
      total_points: Number,
      points_obtained: Number,
      percentage: Number,
      qtns: [
        {
          qtn_id: String,
          submited_answer: String,    //Newly added
          correct_answer: String,     //Newly added
          obtained_score: Number,
          max_score: Number
        }
      ]
    }
  ],
  ratings: Number
});

module.exports = mongoose.model("Dashboard", dashboardSchema);
