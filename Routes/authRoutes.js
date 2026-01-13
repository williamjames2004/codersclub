const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const Dashboard = require('../Models/Dashboard');
const bcrypt = require("bcryptjs");

router.post("/register", async (req, res) => {
  try {
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createpassword, salt);

    const user = new User({
      user_id,
      username,
      regno,
      mobileno: phoneno,
      email,
      department,
      password: hashedPassword,
      plain_password: createpassword   
    });

    await user.save();

    // Create empty dashboard
    await Dashboard.create({
      user_id,
      attempted_quizzes: [],
      ratings: 0
    });

    res.status(200).json({ success: true });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { user_id, password } = req.body;

    // Find user by user_id
    const user = await User.findOne({ user_id });

    if (!user) {
      return res.json({ success: false, message: "Invalid User ID" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Password" });
    }

    // Login success
    res.json({
      success: true,
      user_id: user.user_id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/getuser", async (req,res) => {
  const {user_id} = req.body;

  const user = await User.findOne({user_id: user_id});
  if(!user){
    return res.json({success: false, message: "user doesn't exist"});
  }
  res.json({success: true, data: user});
});
router.get("/allusers", async (req,res)=>{
  try {
    const user = await User.find();
    return res.status(200).json({success: true,user});
  } catch (error){
    return res.status(500).json({success:false,message: "Internal server error", error: error.message});
  }

})
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


