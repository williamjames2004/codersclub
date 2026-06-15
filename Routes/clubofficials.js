const path = require("path");
const express = require('express');
const multer = require("multer");
const router = express.Router();
const Officials = require("../Models/Officials");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "clubofficials/"); // folder name
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post("/createofficial", async (req, res) => {
  try {
    const { regno, name, prof, dept, role } = req.body;

    const exists = await Officials.findOne({ regno });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Official already exists"
      });
    }

    const newOfficial = new Officials({
      regno,
      name,
      prof,
      dept,
      role
    });

    await newOfficial.save();

    res.status(201).json({
      success: true,
      message: "Official added successfully",
      data: newOfficial
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/officials", async (req, res) => {
  try {
    const data = await Officials.find();

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/updateofficial", async (req, res) => {
  try {
    const { regno } = req.body;

    const updated = await Officials.findOneAndUpdate(
      { regno },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Official not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Updated successfully",
      data: updated
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/uploadimage", upload.single("image"), async (req, res) => {
  try {
    const { regno } = req.body;

    if (!regno) {
      return res.status(400).json({
        success: false,
        message: "regno is required"
      });
    }

    const official = await Officials.findOne({ regno });

    if (!official) {
      return res.status(404).json({
        success: false,
        message: "Official not found"
      });
    }

    // Save image path
    official.image = req.file.path;

    await official.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      image: req.file.path
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.delete("/deleteofficial", async (req, res) => {
  try {
    const { regno } = req.body;

    const deleted = await Officials.findOneAndDelete({ regno });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Official not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;