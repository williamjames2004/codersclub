require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const quizRoutes = require("./routes/quizRoutes");

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());

/* Connect DB */
connectDB();

/* Routes */
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/quiz", quizRoutes);

/* Test Route */
app.get("/", (req, res) => {
  res.send("Quiz Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});