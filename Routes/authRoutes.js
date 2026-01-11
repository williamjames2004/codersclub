const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const Dashboard = require('../Models/Dashboard');

router.post("/register", async (req, res) => {
  const {
    user_id,
    username,
    regno,
    phoneno,
    email,
    department,
    createpassword,
    confirmpassword
  } = req.body;

  if (createpassword !== confirmpassword) {
    return res.json({ success: false, message: "Passwords mismatch" });
  }

  const user = new User({
    user_id,
    username,
    regno,
    mobileno: phoneno,
    email,
    department,
    password: createpassword,
    plain_password: createpassword
  });

  await user.save();

  // create empty dashboard
  await Dashboard.create({
    user_id,
    attempted_quizzes: [],
    ratings: 0
  });

  res.json({ success: true });
});

router.post("/login", async (req, res) => {
  const { user_id, password } = req.body;

  const user = await User.findOne({ user_id, password });

  if (!user) {
    return res.json({ success: false });
  }

  res.json({ success: true, user_id });
});
router.post("/getuser", async (req,res) => {
  console.log("received");
  const {user_id} = req.body;

  const user = await User.findOne({user_id: user_id});
  if(!user){
    return res.json({success: false, message: "user doesn't exist"});
  }
  res.json({success: true, data: user});
});
router.post("/student-dashboard", async (req, res) => {
  try {
    const { user_id } = req.body;

    const dashboard = await Dashboard.findOne({ user_id });

    if (!dashboard) {
      return res.status(404).json({
        error: "No dashboard found for this user"
      });
    }

    const quizzes = dashboard.attempted_quizzes.map(q => ({
      quiz_id: q.quiz_id,
      quiz_name: q.quiz_name,
      total_points: q.total_points,
      points_obtained: q.points_obtained,
      percentage: q.percentage,
      qtns: q.qtns.map(qtn => ({
        qtn_id: qtn.qtn_id,
        obtained_score: qtn.obtained_score,
        max_score: qtn.max_score
      }))
    }));

    const no_of_quizzes_attended = quizzes.length;

    let sum_total_points = 0;
    let sum_points_obtained = 0;

    quizzes.forEach(q => {
      sum_total_points += q.total_points || 0;
      sum_points_obtained += q.points_obtained || 0;
    });

    const overall_percentage =
      sum_total_points === 0
        ? 0
        : Number(((sum_points_obtained / sum_total_points) * 100).toFixed(2));

    res.status(200).json({
      user_id,
      no_of_quizzes_attended,
      overall_percentage,
      quizzes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
