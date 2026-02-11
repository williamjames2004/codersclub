const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Quiz = require('../Models/Quiz');
const Dashboard = require('../Models/Dashboard');
const User = require("../Models/User");

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
      created_by
    } = req.body;

    if (!quiz_name || !mode || !created_by) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    if (!["mode1", "mode2", "mode3"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode"
      });
    }

    /* ---------------------------
       Generate quiz_id
    ----------------------------*/
    const lastQuiz = await Quiz.findOne().sort({ createdAt: -1 });

    let quizNumber = 1;
    if (lastQuiz) {
      const lastNumber = parseInt(lastQuiz.quiz_id.split("_")[1]);
      quizNumber = lastNumber + 1;
    }

    const quiz_id = `quiz_${String(quizNumber).padStart(4, "0")}`;

    /* ---------------------------
       Create quiz (no questions)
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
      password,
      created_by,
      total_points: 0,
      qtns: []
    });

    await quiz.save();

    res.json({
      success: true,
      message: "Quiz created successfully",
      quiz_id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.post("/add-questions", async (req, res) => {
  try {
    const { quiz_id, qtns } = req.body;

    if (!quiz_id || !qtns || qtns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Quiz ID and questions required"
      });
    }

    const quiz = await Quiz.findOne({ quiz_id });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    /* ---------------------------
       Generate qtn_id & points
    ----------------------------*/
    let total_points = quiz.total_points || 0;

    const updatedQtns = qtns.map((qtn, index) => {
      total_points += qtn.points || 0;

      return {
        qtn_id: `${quiz_id}_qtn${quiz.qtns.length + index + 1}`,
        qtn: qtn.qtn,
        options: qtn.options,
        correct_answer: qtn.correct_answer,
        points: qtn.points
      };
    });

    /* ---------------------------
       Update quiz
    ----------------------------*/
    quiz.qtns.push(...updatedQtns);
    quiz.total_points = total_points;

    await quiz.save();

    res.json({
      success: true,
      message: "Questions added successfully",
      total_points
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.post("/update", async (req, res) => {
  const { quiz_id, ...data } = req.body;

  await Quiz.updateOne({ quiz_id }, data);

  res.json({ success: true });
});

router.post("/delete", async (req, res) => {
  const { quiz_id } = req.body;

  if (!quiz_id) {
    return res.status(400).json({
      success: false,
      message: "quiz_id is required",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Check if quiz exists
    const quiz = await Quiz.findOne({ quiz_id }).session(session);

    if (!quiz) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // 2️⃣ Delete quiz from Quiz collection
    await Quiz.deleteOne({ quiz_id }).session(session);

    // 3️⃣ Remove quiz from all dashboards
    await Dashboard.updateMany(
      {},
      {
        $pull: {
          attempted_quizzes: { quiz_id: quiz_id },
        },
      }
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Quiz deleted successfully from Quiz and Dashboard",
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/by-id", async (req, res) => {
  const { quiz_id } = req.body;

  const quiz = await Quiz.findOne({ quiz_id });

  res.json(quiz);
});

router.post("/all", async (req, res) => {
  try {
    const { user_id } = req.body;

    // 🔹 1. Get User
    const user = await User.findOne({ user_id });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const followingAdmins = user.following || [];

    // 🔹 2. Get Dashboard
    const dashboard = await Dashboard.findOne({ user_id });

    const attemptedIds = dashboard?.attempted_quizzes?.map(
      q => q.quiz_id
    ) || [];

    // 🔹 3. Build Filter Object
    let filter = {};

    // Filter by following admins (if any followed)
    if (followingAdmins.length > 0) {
      filter.created_by = { $in: followingAdmins };
    }

    // Remove attempted quizzes
    if (attemptedIds.length > 0) {
      filter.quiz_id = { $nin: attemptedIds };
    }

    // 🔹 4. Fetch Quizzes
    const quizzes = await Quiz.find(filter);

    res.json({
      success: true,
      quizzes
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});
router.get("/all", async (req,res)=>{
  try{
    const quizzes = await Quiz.find();
    return res.status(200).json({success: true, quizzes});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
})

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

    if (!user_id || !attempted_quizzes || !attempted_quizzes.length) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const {
      quiz_id,
      qtns,
      submission_time
    } = attempted_quizzes[0];

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
            submission_time:
              typeof submission_time === "number" && submission_time > 0
                ? submission_time
                : 0,
            total_points: stats.total_points,
            points_obtained: stats.points_obtained,
            percentage: stats.percentage
          }
        ]
      });

      await dashboard.save();

      return res.status(201).json({
        message: "Dashboard created & quiz saved",
        quiz_id,
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
        submission_time:
          typeof submission_time === "number" && submission_time > 0
            ? submission_time
            : 0,
        total_points: stats.total_points,
        points_obtained: stats.points_obtained,
        percentage: stats.percentage
      });

      await dashboard.save();

      return res.status(200).json({
        message: "Quiz added to dashboard",
        quiz_id,
        ...stats
      });
    }

    // 6️⃣ Quiz exists → merge questions
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

    // 7️⃣ Update submission_time ONLY ON FINAL SUBMISSION
    if (
      typeof submission_time === "number" &&
      submission_time > 0 &&
      (!quiz.submission_time || quiz.submission_time === 0)
    ) {
      quiz.submission_time = submission_time;
    }

    // 8️⃣ Recalculate stats
    const stats = calculateQuizStats(quiz.qtns);

    quiz.total_points = stats.total_points;
    quiz.points_obtained = stats.points_obtained;
    quiz.percentage = stats.percentage;

    await dashboard.save();

    return res.status(200).json({
      message: "Quiz updated successfully",
      quiz_id,
      ...stats
    });

  } catch (err) {
    console.error("Submit Answer Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
