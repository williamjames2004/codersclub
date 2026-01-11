const express = require('express');
const router = express.Router();
const Quiz = require('../Models/Quiz');
const Dashboard = require('../Models/Dashboard');

// CREATE QUIZ
router.post("/create", async (req, res) => {
  try {
    const {
      quiz_name,
      category,
      description,
      difficulty,
      time_limit,
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

    /* ---------------------------
       3. Create Quiz
    ----------------------------*/
    const quiz = new Quiz({
      quiz_id,
      quiz_name,
      category,
      description,
      difficulty,
      time_limit,
      total_points,
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
    const { user_id, attended_quiz } = req.body;
    const { quiz_id, qtns } = attended_quiz;

    // 1. Find dashboard
    let dashboard = await Dashboard.findOne({ user_id });
    let quizcollection = await Quiz.findOne({quiz_id});
    const quiz_name = quizcollection.quiz_name;

    // 2. If dashboard not exists → create with first quiz & question
    if (!dashboard) {
      dashboard = new Dashboard({
        user_id,
        attempted_quizzes: [
          {
            quiz_id,
            quiz_name,
            qtns: [qtns],
            total_points: qtns.max_score,
            points_obtained: qtns.obtained_score,
            percentage:
              qtns.max_score === 0
                ? 0
                : Number(((qtns.obtained_score / qtns.max_score) * 100).toFixed(2))
          }
        ]
      });

      await dashboard.save();
      return res.status(201).json({ message: "First question submitted" });
    }

    // 3. Find quiz
    let quiz = dashboard.attempted_quizzes.find(
      q => q.quiz_id === quiz_id
    );

    // 4. If quiz not exists → create quiz with first question
    if (!quiz) {
      dashboard.attempted_quizzes.push({
        quiz_id,
        quiz_name,
        qtns: [qtns],
        total_points: qtns.max_score,
        points_obtained: qtns.obtained_score,
        percentage:
          qtns.max_score === 0
            ? 0
            : Number(((qtns.obtained_score / qtns.max_score) * 100).toFixed(2))
      });

      await dashboard.save();
      return res.status(200).json({ message: "Quiz started & question submitted" });
    }

    // 5. Quiz exists → update or insert question
    const qtnIndex = quiz.qtns.findIndex(
      q => q.qtn_id === qtns.qtn_id
    );

    if (qtnIndex !== -1) {
      quiz.qtns[qtnIndex] = qtns; // overwrite
    } else {
      quiz.qtns.push(qtns);
    }

    // 6. Recalculate quiz summary
    let total_points = 0;
    let points_obtained = 0;

    quiz.qtns.forEach(q => {
      total_points += q.max_score;
      points_obtained += q.obtained_score;
    });

    quiz.total_points = total_points;
    quiz.points_obtained = points_obtained;
    quiz.percentage =
      total_points === 0
        ? 0
        : Number(((points_obtained / total_points) * 100).toFixed(2));

    await dashboard.save();

    res.status(200).json({
      message: "Question submitted & quiz updated",
      total_points,
      points_obtained,
      percentage: quiz.percentage
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
