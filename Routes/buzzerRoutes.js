const express = require("express");
const router = express.Router();

const Buzzer = require("../Models/Buzzer");
const BuzzerScore = require("../Models/BuzzerScore");
const BuzzerResult = require("../Models/BuzzerResult");
const { C1, C2, C3 } = require("../config/buzzerScore");

function istToUtc(dateStr) {
  return new Date(new Date(dateStr).getTime() - 5.5 * 60 * 60 * 1000);
}

function utcToIstString(date) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .replace("Z", "");
}

/* =========================================================
   CREATE BUZZER GAME
========================================================= */
/* =========================================================
   CREATE BUZZER GAME  (TIMEZONE-SAFE)
========================================================= */
router.post("/createbuzzer", async (req, res) => {
  try {
    const {
      game_name,
      password,
      total_qtns,
      start_time, // MUST include timezone: +05:30
      duration_minutes,
    } = req.body;

    if (!game_name || !password || !total_qtns || !start_time || !duration_minutes) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    /* 🔐 Validate ISO with timezone */
    if (!start_time.match(/([zZ]|[+-]\d{2}:\d{2})$/)) {
      return res.status(400).json({
        success: false,
        message: "start_time must include timezone (example: +05:30)",
      });
    }

    /* 🆔 Generate Game ID */
    const lastGame = await Buzzer.findOne().sort({ createdAt: -1 });
    let gameNumber = 1;

    if (lastGame) {
      const lastNumber = parseInt(lastGame.game_id.split("_")[1]);
      if (!isNaN(lastNumber)) gameNumber = lastNumber + 1;
    }

    const game_id = `buzzer_${String(gameNumber).padStart(4, "0")}`;

    /* ⏱️ TIME HANDLING (CORRECT) */
    const startUTC = new Date(start_time); // auto converts to UTC
    const endUTC = new Date(startUTC.getTime() + duration_minutes * 60000);

    /* ❓ QUESTIONS */
    const qtns_array = [];
    for (let i = 1; i <= total_qtns; i++) {
      qtns_array.push({
        qtn_id: `${game_id}_Q${i}`,
        submissions: [],
      });
    }

    const game = new Buzzer({
      game_id,
      game_name,
      password,
      total_qtns,
      duration_minutes,

      start_time_utc: startUTC,
      end_time_utc: endUTC,

      // Optional display values (derived, not authoritative)
      start_time_ist: startUTC.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      end_time_ist: endUTC.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),

      qtns_array,
    });

    await game.save();

    res.json({ success: true, data: game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});
/* =========================================================
   GET ALL GAMES
========================================================= */
router.get("/all", async (req, res) => {
  try {
    const games = await Buzzer.find().sort({ start_time_utc: 1 });
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
