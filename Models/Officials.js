const mongoose = require("mongoose");

const Officials = new mongoose.Schema({
    regno: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    prof: { type: String, required: true },
    dept: { type: String, required: true },
    role: [String],
    image: {
        type: String, 
        default: ""
    }
});

module.exports = mongoose.model("Officials", Officials);