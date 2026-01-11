const express = require('express');
const router = express.Router();
const Admin = require('../Models/Admin');
const Dashboard = require('../Models/Dashboard');
const bcrypt = require("bcryptjs");
const Quiz = require('../Models/Quiz');

//Helper function
const generateAdminId = async (adminType) => {
  const fixedIds = {
    President: "p001",
    VicePresident: "vp01",
    Secretary: "s001",
    ViceSecretary: "vs01",
    Volunteer: "v001"
  };

  // Fixed roles
  if (fixedIds[adminType]) {
    return fixedIds[adminType];
  }

  // Incremental roles
  let prefix = "";

  if (adminType === "Professor") prefix = "pf";
  if (adminType === "Special") prefix = "sp";
  if (adminType === "Master") prefix = "master";
  if (adminType === "Dev") prefix = "dev";

  const lastAdmin = await Admin.findOne({
    admin_id: { $regex: `^${prefix}` }
  }).sort({ admin_id: -1 });

  let nextNumber = 1;

  if (lastAdmin) {
    const lastNumber = parseInt(lastAdmin.admin_id.replace(prefix, ""));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(2, "0")}`;
};

router.post("/adminRegister", async (req, res) => {
  try {
    const { name, password, adminType } = req.body;

    // Generate admin_id automatically
    const admin_id = await generateAdminId(adminType);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      admin_id,
      name,
      password: hashedPassword,
      adminType
    });

    res.json({
      success: true,
      admin_id,
      adminType
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/adminlogin", async (req, res) => {
  try {
    const { admin_id, password } = req.body;

    // Find admin by admin_id
    const admin = await Admin.findOne({ admin_id });

    if (!admin) {
      return res.json({ success: false, message: "Invalid Admin ID" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Password" });
    }

    // Login success → return adminType
    res.json({
      success: true,
      admin_id: admin.admin_id,
      adminType: admin.adminType
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.post("/findallquiz", async (req,res)=> {
  try{
    const {admin_id} = req.body;
    const quizzes = await Quiz.find({created_by: admin_id});
    return res.status(200).json({success: true, quizzes});
  } catch (error){
    return res.status(500).json({success: false, error: error.message});
  }
});
router.post("/deletequiz", async (req, res) => {
  try {
    const { admin_id, quiz_id } = req.body;

    const quiz = await Quiz.findOneAndDelete({
      quiz_id: quiz_id,
      admin_id: admin_id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found or unauthorized"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quiz deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.post("/quiz-dashboard", async (req, res) => {
  try {
    const { quiz_id } = req.body;

    const result = await Dashboard.aggregate([
      // 1. Break attempted_quizzes array
      { $unwind: "$attempted_quizzes" },

      // 2. Match quiz_id
      {
        $match: {
          "attempted_quizzes.quiz_id": quiz_id
        }
      },

      // 3. Shape required fields
      {
        $project: {
          user_id: 1,
          total_points: "$attempted_quizzes.total_points",
          points_obtained: "$attempted_quizzes.points_obtained"
        }
      },

      // 4. Group for leaderboard + totals
      {
        $group: {
          _id: null,
          leaderboard: {
            $push: {
              user_id: "$user_id",
              total_points: "$total_points",
              points_obtained: "$points_obtained"
            }
          },
          attended_students: { $sum: 1 },
          sum_total_points: { $sum: "$total_points" },
          sum_points_obtained: { $sum: "$points_obtained" }
        }
      },

      // 5. Calculate overall percentage
      {
        $project: {
          _id: 0,
          leaderboard: 1,
          attended_students: 1,
          overall_percentage: {
            $cond: [
              { $eq: ["$sum_total_points", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$sum_points_obtained", "$sum_total_points"] },
                      100
                    ]
                  },
                  2
                ]
              }
            ]
          }
        }
      }
    ]);

    if (result.length === 0) {
      return res.status(404).json({
        message: "No attempts found for this quiz"
      });
    }

    res.status(200).json({
      quiz_id,
      ...result[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
