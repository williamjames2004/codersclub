const express = require('express');
const router = express.Router();
const Quiz = require('../Models/Quiz');
const Dashboard = require('../Models/Dashboard');

router.post("/create", async (req, res) => {
  const quiz = new Quiz(req.body);
  await quiz.save();
  res.json({ success: true });
});

router.post("/update", async (req, res) => {
  const { quiz_id, ...data } = req.body;

  await Quiz.updateOne({ quiz_id }, data);

  res.json({ success: true });
});

router.post("/delete", async (req, res) => {
  const { quiz_id } = req.body;

  await Quiz.deleteOne({ quiz_id });

  res.json({ success: true });
});

router.post("/by-id", async (req, res) => {
  const { quiz_id } = req.body;

  const quiz = await Quiz.findOne({ quiz_id });

  res.json(quiz);
});

router.post("/all", async (req, res) => {
  try {
    const { user_id } = req.body;

    const dashboard = await Dashboard.findOne({ user_id });

    // Case 1: No dashboard → no quizzes attempted → show all
    if (!dashboard || dashboard.attempted_quizzes.length === 0) {
      const quizzes = await Quiz.find();
      return res.json(quizzes);
    }

    // Case 2: Dashboard exists → filter unattempted
    const attemptedIds = dashboard.attempted_quizzes.map(
      q => q.quiz_id
    );

    const quizzes = await Quiz.find({
      quiz_id: { $nin: attemptedIds }
    });

    res.json(quizzes);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});
module.exports = router;