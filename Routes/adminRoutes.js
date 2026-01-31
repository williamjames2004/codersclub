const path = require("path");
const express = require('express');
const router = express.Router();
const Admin = require('../Models/Admin');
const User = require('../Models/User');
const Dashboard = require('../Models/Dashboard');
const tempdata = require('../Models/TempData');
const bcrypt = require("bcryptjs");
const Quiz = require('../Models/Quiz');
const upload = require("../middlewares/upload");
const AdminPermission = require("../Models/AdminPermission");

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

    const admin_id = await generateAdminId(adminType);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const profession =
      adminType === "Professor" || adminType === "Master"
        ? "professor"
        : "student";

    // 1️⃣ Create Admin
    const admin = await Admin.create({
      admin_id,
      name,
      password: hashedPassword,
      adminType,
      profession
    });

    // 2️⃣ Create default permissions
    await AdminPermission.create({
      admin_id
      // all permissions default to false automatically
    });

    res.status(201).json({
      success: true,
      admin_id,
      adminType,
      profession
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
router.put(
  "/profileimage",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { admin_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image file required"
        });
      }

      const admin = await Admin.findOne({ admin_id });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found"
        });
      }

      admin.profileImage = `/uploads/admins/${req.file.filename}`;
      await admin.save();

      res.status(200).json({
        success: true,
        message: "Profile image updated successfully",
        profileImage: admin.profileImage
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);
router.put("/profiledataentry", async (req, res) => {
  try {
    const {
      admin_id,

      // common fields
      officialEmail,
      officialContact,
      status,
      appointedDate,
      tenureEndDate,

      // profiles
      studentAdminProfile,
      professorAdminProfile
    } = req.body;

    if (!admin_id) {
      return res.status(400).json({
        success: false,
        message: "admin_id is required"
      });
    }

    const admin = await Admin.findOne({ admin_id });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    /* =========================
       UPDATE COMMON FIELDS
       ========================= */

    if (officialEmail !== undefined)
      admin.officialEmail = officialEmail;

    if (officialContact !== undefined)
      admin.officialContact = officialContact;

    if (status !== undefined)
      admin.status = status;

    if (appointedDate !== undefined)
      admin.appointedDate = appointedDate;

    if (tenureEndDate !== undefined)
      admin.tenureEndDate = tenureEndDate;

    /* =========================
       PROFESSION-SPECIFIC UPDATE
       ========================= */

    if (admin.profession === "student") {
      if (studentAdminProfile) {
        admin.studentAdminProfile = {
          ...admin.studentAdminProfile,
          ...studentAdminProfile
        };
      }
    }

    if (admin.profession === "professor") {
      if (professorAdminProfile) {
        admin.professorAdminProfile = {
          ...admin.professorAdminProfile,
          ...professorAdminProfile
        };
      }
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Profile details updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.get("/getalladmins", async(req,res)=>{
  try{
    const admins = await Admin.find();
    res.status(200).json({success: true, admins});
  }catch (error){
    return res.status(500).json({success: false, message: error.message});
  }
})
router.post("/getadmins", async(req,res)=>{
  try{
    const {admin_id} = req.body;
    if(!admin_id){
      return res.status(400).json({success: false, message: "Un authorized access"});
    }
    const Master = await Admin.findOne({admin_id: admin_id});
    if(!Master){
      return res.status(404).json({success: false, message: "Invalid admin! un authorized access"});
    }
    const Admins = await Admin.find();
    return res.status(200).json({success: true, Admins});
  } catch (error){
    return res.status(500).json({success: false, message: error.message});
  }
})
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
router.get("/leaderboard", async(req,res)=>{
  try{
    const students = await Dashboard.find();
    
    return res.status(200).json({success: true, students});
  }catch(err){
    res.status(500).json({success: false, message: err.message});
  }
})
router.post("/deleteadmin", async(req,res)=>{
  try{
    const {admin_id} = req.body;
    if(!admin_id){
      res.status(400).json({success: false, message: "admin_id is required"});
    }
    const admin = await Admin.findOne({admin_id: admin_id});
    if(!admin){
      res.status(404).json({success: false, message: "admin not found"});
    }
    await admin.deleteOne();
    res.status(200).json({success: true, message: "admin deleted successfully"});
  } catch(err){
    res.status(500).json({success: false, message: err.message});
  }
});
router.put("/changepassword", async (req, res) => {
  try {
    const { admin_id, password } = req.body;

    if (!admin_id || !password) {
      return res.status(400).json({
        success: false,
        message: "admin_id and password are required"
      });
    }

    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // remove existing request if any
    await tempdata.findOneAndDelete({ user_id: admin_id });

    // store plain password temporarily
    await tempdata.create({
      admin_id: admin_id,
      password: password
    });

    res.status(200).json({
      success: true,
      message: "Password change request submitted for approval"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.patch("/approvepassword", async (req, res) => {
  try {
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({
        success: false,
        message: "admin_id is required"
      });
    }

    const temp = await tempdata.findOne({ admin_id: admin_id });
    if (!temp) {
      return res.status(404).json({
        success: false,
        message: "No pending password request found"
      });
    }

    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temp.password, salt);

    // update admin password
    admin.password = hashedPassword;
    await admin.save();

    // delete temp password
    await tempdata.deleteOne({ admin_id: admin_id });

    res.status(200).json({
      success: true,
      message: "Password approved and updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.post("/checkforpasswordchange", async(req,res)=>{
  try{
    const {admin_id} = req.body;
    if(!admin_id){
      return res.status(400).json({success: false, message: "Unauthorized access"});
    }
    const request = await tempdata.findOne({admin_id: admin_id});
    if (request === null){
      return res.status(200).json({success: true, message: "No requests"});
    }
    return res.status(200).json({success: true, admin_id: request.admin_id});
  }catch(error){
    return res.status(500).json({success: false, message: error.message});
  }
});
router.post("/rejectrequest", async(req,res)=>{
  try{
    const {admin_id} = req.body;
    if(!admin_id){
      return res.status(400).json({success: false, message: "Unauthorized access"});
    }
    const request = await tempdata.findOne({admin_id: admin_id});
    await request.deleteOne();
    return res.status(200).json({success: true, message: "Request rejected"});
  }catch(error){
    return res.status(500).json({success: false, message: error.message});
  }
})
router.post("/adminentrytodb", async (req, res) => {
  try {
    const { admin_id, password } = req.body;

    if (!admin_id || !password) {
      return res.status(400).json({
        success: false,
        message: "admin_id and password required"
      });
    }

    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // only Dev or Master
    if (!["Dev", "Master"].includes(admin.adminType)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // READ-ONLY FETCH
    const admins = await Admin.find().select("-password");
    const dashboards = await Dashboard.find();
    const quizzes = await Quiz.find();
    const users = await User.find();
    const tempPasswords = await tempdata.find();

    res.status(200).json({
      success: true,
      data: {
        admins,
        dashboards,
        quizzes,
        users,
        tempPasswords
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/permissions", async (req, res) => {
  const { admin_id } = req.body;

  const permissions = await AdminPermission.findOne(
    { admin_id },
    { 
      _id: 0,
      admin_id: 0,
      createdAt: 0,
      updatedAt: 0,
      __v: 0
    }
  );

  if (!permissions) {
    return res.json({ success: false });
  }

  res.json({
    success: true,
    admin_id,
    permissions
  });
});
router.post("/update-permissions", async (req, res) => {
  const { admin_id, permissions } = req.body;

  await AdminPermission.findOneAndUpdate(
    { admin_id },
    permissions,
    { upsert: true }
  );

  res.json({ success: true });
});


module.exports = router;
