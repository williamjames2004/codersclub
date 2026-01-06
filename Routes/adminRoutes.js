const express = require('express');
const router = express.Router();
const Admin = require('../Models/Admin');

router.post("/adminRegister", async (req, res) => {
  const { admin_id, name, password } = req.body;

  await Admin.create({ admin_id, name, password });

  res.json({ success: true });
});

router.post("/adminlogin", async (req, res) => {
  const { admin_id, password } = req.body;

  const admin = await Admin.findOne({ admin_id, password });

  if (!admin) return res.json({ success: false });

  res.json({ success: true, admin_id });
});

module.exports = router;