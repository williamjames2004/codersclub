const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    quiz_id: { type: String, unique: true, required: true },
    quiz_name: { type: String, required: true },

    category: String,
    description: String,

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"]
    },

    time_limit: Number, 
    total_points: Number,

    shuffle_questions: { type: Boolean, default: true },
    shuffle_options: { type: Boolean, default: true },

    is_active: { type: Boolean, default: true },
    is_public: { type: Boolean, default: true },

    attempt_count: { type: Number, default: 0 },
    max_attempt: { type: Number, default: 1 },

    qtns: [
      {
        qtn_id: String,
        qtn: String,
        options: [String],
        correct_answer: String,
        points: Number,
      }
    ],

    created_by: String 
  },
  {
    timestamps: true 
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
