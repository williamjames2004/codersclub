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
  const {user_id} = req.body;

  const user = await User.findOne({user_id: user_id});
  if(!user){
    return res.json({success: false, message: "user doesn't exist"});
  }
  res.json({success: true, data: user});
})

module.exports = router;
