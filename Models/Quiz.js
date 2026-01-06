const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  quiz_id: { type: String, unique: true },
  quiz_name: String,
  category: String,
  qtns: [
    {
      qtn: String,
      options: [String], // ["opt1","opt2","opt3","opt4"]
      correct_answer: String,
      points: Number
    }
  ]
});

module.exports = mongoose.model("Quiz", quizSchema);