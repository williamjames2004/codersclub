const express = require("express");
const router = express.Router();

const Buzzer = require("../Models/Buzzer");
const BuzzerScore = require("../Models/BuzzerScore");
const BuzzerResult = require("../Models/BuzzerResult");
const { C1, C2, C3 } = require("../config/buzzerScore");

/* =========================================================
   CREATE BUZZER GAME
========================================================= */
router.post("/createbuzzer", async (req, res) => {
  try {
    const { game_name, password, total_qtns } = req.body;

    if (!game_name || !password || !total_qtns) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    const lastGame = await Buzzer.findOne().sort({ createdAt: -1 });
    let gameNumber = 1;

    if (lastGame) {
      const lastNumber = parseInt(lastGame.game_id.split("_")[1]);
      if (!isNaN(lastNumber)) gameNumber = lastNumber + 1;
    }

    const game_id = `buzzer_${String(gameNumber).padStart(4, "0")}`;

    const qtns_array = [];
    for (let i = 1; i <= total_qtns; i++) {
      qtns_array.push({
        qtn_id: `${game_id}_Q${i}`,
        first_submission: null,
        second_submission: null,
        submissions: []
      });
    }

    const game = new Buzzer({
      game_id,
      game_name,
      password,
      total_qtns,
      qtns_array
    });

    await game.save();

    res.json({ success: true, data: game });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   GET ALL GAMES
========================================================= */
router.get("/all", async (req, res) => {
  try {
    const games = await Buzzer.find();
    res.json({ success: true, data: games });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   GET GAME BY ID
========================================================= */
router.post("/by-id", async (req, res) => {
  const { game_id } = req.body;

  try {
    const game = await Buzzer.findOne({ game_id });
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    res.json({ success: true, data: game });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   BUZZER PRESS
========================================================= */
router.post("/press", async (req, res) => {
  const { game_id, qtn_id, user } = req.body;

  try {
    const game = await Buzzer.findOne({ game_id });
    if (!game) return res.status(404).json({ success: false });

    if (!game.global_active) {
      return res.json({ success: false, message: "Buzzer closed" });
    }

    const qtn = game.qtns_array.find(q => q.qtn_id === qtn_id);
    if (!qtn) return res.status(404).json({ success: false });

    if (qtn.submissions.includes(user)) {
      return res.json({ success: false, message: "Already buzzed" });
    }

    qtn.submissions.push(user);

    if (!qtn.first_submission) {
      qtn.first_submission = user;
    } else if (!qtn.second_submission) {
      qtn.second_submission = user;
    }

    await game.save();

    res.json({
      success: true,
      first_submission: qtn.first_submission,
      second_submission: qtn.second_submission
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   LIVE QUESTION (POST ONLY)
========================================================= */
router.post("/live-question", async (req, res) => {
  const { game_id, qtn_id } = req.body;

  try {
    const game = await Buzzer.findOne({ game_id });
    if (!game) return res.status(404).json({ success: false });

    const qtn = game.qtns_array.find(q => q.qtn_id === qtn_id);
    if (!qtn) return res.status(404).json({ success: false });

    res.json({
      success: true,
      data: {
        first_submission: qtn.first_submission,
        second_submission: qtn.second_submission,
        submissions: qtn.submissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   UPDATE SCORE
========================================================= */
router.post("/update-score", async (req, res) => {
  const { game_id, user_id, delta } = req.body;

  try {
    const score = await BuzzerScore.findOneAndUpdate(
      { game_id, user_id },
      { $inc: { score: delta } },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: score });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   GET SCOREBOARD
========================================================= */
router.post("/scores", async (req, res) => {
  const { game_id } = req.body;

  try {
    const scores = await BuzzerScore.find({ game_id }).sort({ score: -1 });
    res.json({ success: true, data: scores });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   SUBMIT QUESTION RESULT
========================================================= */
router.post("/submit-result", async (req, res) => {
  try {
    const result = new BuzzerResult(req.body);
    await result.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* =========================================================
   LOCK / RESET BUZZER
========================================================= */
router.post("/lock-buzzer", async (req, res) => {
  const { game_id } = req.body;

  const game = await Buzzer.findOneAndUpdate(
    { game_id },
    { global_active: false },
    { new: true }
  );

  res.json({ success: true, global_active: game.global_active });
});

router.post("/reset-buzzer", async (req, res) => {
  const { game_id, qtn_id } = req.body;

  const game = await Buzzer.findOne({ game_id });
  if (!game) return res.status(404).json({ success: false });

  const qtn = game.qtns_array.find(q => q.qtn_id === qtn_id);
  if (!qtn) return res.status(404).json({ success: false });

  qtn.first_submission = null;
  qtn.second_submission = null;
  qtn.submissions = [];

  game.global_active = true;
  await game.save();

  res.json({ success: true });
});

module.exports = router;