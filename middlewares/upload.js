const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = "uploads/admins";

// ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const { admin_id } = req.body;

    if (!admin_id) {
      return cb(new Error("admin_id is required"));
    }

    // 🔥 DELETE OLD IMAGE FIRST (ANY EXTENSION)
    const extensions = [".jpg", ".jpeg", ".png", ".webp"];
    extensions.forEach(ext => {
      const filePath = path.join(uploadDir, `${admin_id}${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // SAVE NEW IMAGE
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${admin_id}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error("Only image files allowed"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});