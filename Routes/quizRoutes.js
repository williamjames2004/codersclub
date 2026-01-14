const express = require('express');
const router = express.Router();
const Quiz = require('../Models/Quiz');
const Dashboard = require('../Models/Dashboard');

function calculateQuizStats(qtns) {
  let total_points = 0;
  let points_obtained = 0;

  qtns.forEach(q => {
    total_points += Number(q.max_score || 0);
    points_obtained += Number(q.obtained_score || 0);
  });

  const percentage =
    total_points === 0
      ? 0
      : Number(((points_obtained / total_points) * 100).toFixed(2));

  return { total_points, points_obtained, percentage };
}

// CREATE QUIZ
router.post("/create", async (req, res) => {
  try {
    const {
      quiz_name,
      category,
      description,
      mode,
      difficulty,
      time_limit,
      max_attempt,
      password,
      qtns,
      created_by
    } = req.body;

    if (!quiz_name || !qtns || qtns.length === 0) {
      return res.json({ success: false, message: "Invalid input" });
    }

    /* ---------------------------
       1. Generate quiz_id
    ----------------------------*/
    const lastQuiz = await Quiz.findOne().sort({ createdAt: -1 });

    let quizNumber = 1;
    if (lastQuiz) {
      const lastNumber = parseInt(lastQuiz.quiz_id.split("_")[1]);
      quizNumber = lastNumber + 1;
    }

    const quiz_id = `quiz_${String(quizNumber).padStart(4, "0")}`;

    /* ---------------------------
       2. Generate qtn_id & total_points
    ----------------------------*/
    let total_points = 0;

    const updatedQtns = qtns.map((qtn, index) => {
      total_points += qtn.points || 0;

      return {
        qtn_id: `${quiz_id}_qtn${index + 1}`,
        qtn: qtn.qtn,
        options: qtn.options,
        correct_answer: qtn.correct_answer,
        points: qtn.points
      };
    });
    if(mode !== "mode1" && mode !== "mode2" && mode !== "mode3"){
      return res.status(400).json({success: false, message: "Invalied mode choice"});
    }

    /* ---------------------------
       3. Create Quiz
    ----------------------------*/
    const quiz = new Quiz({
      quiz_id,
      quiz_name,
      category,
      description,
      mode,
      difficulty,
      time_limit,
      max_attempt,
      total_points,
      password,
      qtns: updatedQtns,
      created_by
    });

    await quiz.save();

    res.json({
      success: true,
      message: "Quiz created successfully",
      quiz_id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
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

router.post("/updateQuizFlag", async (req, res) => {
  try {
    const { quiz_id, field, value } = req.body;

    const allowedFields = [
      "shuffle_questions",
      "shuffle_options",
      "is_active",
      "is_public"
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid field" });
    }

    const quiz = await Quiz.findOneAndUpdate(
      { quiz_id },
      { [field]: value },
      { new: true }
    );

    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/submitanswer", async (req, res) => {
  try {
    const { user_id, attempted_quizzes } = req.body;
    console.log("success");

    if (!user_id || !attempted_quizzes || !attempted_quizzes.length) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const { quiz_id, qtns } = attempted_quizzes[0];

    if (!quiz_id || !Array.isArray(qtns) || !qtns.length) {
      return res.status(400).json({ error: "Invalid quiz or question data" });
    }

    // 1️⃣ Find dashboard
    let dashboard = await Dashboard.findOne({ user_id });

    // 2️⃣ Get quiz name safely
    const quizDoc = await Quiz.findOne({ quiz_id });
    const quiz_name = quizDoc?.quiz_name || "Unknown Quiz";

    // 3️⃣ If dashboard does NOT exist
    if (!dashboard) {
      const stats = calculateQuizStats(qtns);

      dashboard = new Dashboard({
        user_id,
        attempted_quizzes: [
          {
            quiz_id,
            quiz_name,
            qtns,
            total_points: stats.total_points,
            points_obtained: stats.points_obtained,
            percentage: stats.percentage
          }
        ]
      });

      await dashboard.save();
      return res.status(201).json({
        message: "Dashboard created & quiz saved",
        ...stats
      });
    }

    // 4️⃣ Dashboard exists → find quiz
    let quiz = dashboard.attempted_quizzes.find(
      q => q.quiz_id === quiz_id
    );

    // 5️⃣ Quiz does NOT exist
    if (!quiz) {
      const stats = calculateQuizStats(qtns);

      dashboard.attempted_quizzes.push({
        quiz_id,
        quiz_name,
        qtns,
        total_points: stats.total_points,
        points_obtained: stats.points_obtained,
        percentage: stats.percentage
      });

      await dashboard.save();
      return res.status(200).json({
        message: "Quiz added to dashboard",
        ...stats
      });
    }

    // 6️⃣ Quiz exists → merge questions properly
    qtns.forEach(incomingQtn => {
      const index = quiz.qtns.findIndex(
        q => q.qtn_id === incomingQtn.qtn_id
      );

      if (index !== -1) {
        quiz.qtns[index] = incomingQtn; // overwrite
      } else {
        quiz.qtns.push(incomingQtn);
      }
    });

    // 7️⃣ Recalculate quiz stats
    const stats = calculateQuizStats(quiz.qtns);

    quiz.total_points = stats.total_points;
    quiz.points_obtained = stats.points_obtained;
    quiz.percentage = stats.percentage;

    await dashboard.save();

    res.status(200).json({
      message: "Quiz updated successfully",
      quiz_id,
      ...stats
    });

  } catch (err) {
    console.error("Submit Answer Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
