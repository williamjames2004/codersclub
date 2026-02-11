const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const Dashboard = require('../Models/Dashboard');
const bcrypt = require("bcryptjs");
const Messages = require("../Models/Messages");

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
router.post("/registermany", async (req, res) => {
  try {
    const users = req.body;

    // 1️⃣ Validate array
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array"
      });
    }

    const insertedUsers = [];
    const skippedUsers = [];

    for (const data of users) {
      const {
        user_id,
        username,
        regno,
        phoneno,
        email,
        department,
        createpassword,
        confirmpassword
      } = data;

      // 2️⃣ Required field check
      if (
        !user_id ||
        !username ||
        !regno ||
        !email ||
        !department ||
        !createpassword ||
        !confirmpassword
      ) {
        skippedUsers.push({
          email,
          reason: "Missing required fields"
        });
        continue;
      }

      // 3️⃣ Password mismatch
      if (createpassword !== confirmpassword) {
        skippedUsers.push({
          email,
          reason: "Password mismatch"
        });
        continue;
      }

      // 4️⃣ Duplicate check
      const existingUser = await User.findOne({
        $or: [{ email }, { regno }]
      });

      if (existingUser) {
        skippedUsers.push({
          email,
          reason: "User already exists"
        });
        continue;
      }

      // 5️⃣ Hash password
      const hashedPassword = await bcrypt.hash(createpassword, 10);

      // 6️⃣ Create user
      const user = await User.create({
        user_id,
        username,
        regno,
        mobileno: phoneno,
        email,
        department,
        password: hashedPassword,
        plain_password: createpassword // ⚠️ consider removing later
      });

      // 7️⃣ Create dashboard
      await Dashboard.create({
        user_id,
        attempted_quizzes: [],
        ratings: 0
      });

      insertedUsers.push(email);
    }

    res.status(200).json({
      success: true,
      total: users.length,
      registered: insertedUsers.length,
      skipped: skippedUsers.length,
      insertedUsers,
      skippedUsers
    });

  } catch (error) {
    console.error(error);
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
        submited_answer: qtn.submited_answer,
        correct_answer: qtn.correct_answer,
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
router.put("/sendmessage", async (req, res) => {
  try {
    const { user_id, feedback, suggestions, complains } = req.body;

    const data = await Messages.create({
      user_id,
      feedback,
      suggestions,
      complains
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
router.post("/follow", async (req, res) => {
  try {
    const { user_id, admin_id } = req.body;

    const user = await User.findOneAndUpdate(
      { user_id },
      { $addToSet: { following: admin_id } }, // prevents duplicates
      { new: true }
    );

    res.json({
      success: true,
      message: "Followed successfully",
      following: user.following
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post("/unfollow", async (req, res) => {
  try {
    const { user_id, admin_id } = req.body;

    const user = await User.findOneAndUpdate(
      { user_id },
      { $pull: { following: admin_id } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Unfollowed successfully",
      following: user.following
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;

