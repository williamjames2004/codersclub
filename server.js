require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./Routes/authRoutes");
const adminRoutes = require("./Routes/adminRoutes");
const quizRoutes = require("./Routes/quizRoutes");
const buzzerRoutes = require("./Routes/buzzerRoutes");
const officials = require("./Routes/clubofficials");

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());

// 👇 expose uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/clubofficials", express.static(path.join(__dirname, "clubofficials")));

/* Connect DB */
connectDB();

/* Routes */
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/quiz", quizRoutes);
app.use("/buzzer", buzzerRoutes);
app.use("/clubofficials", officials);

/* Test Route */
app.get("/", (req, res) => {
  res.send("Quiz Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
