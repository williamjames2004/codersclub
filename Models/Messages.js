const mongoose = require("mongoose");

const messages = new mongoose.Schema({
    user_id: {type: String, required: true},
    feedback: {type: String, required: false},
    suggestions: {type: String, required: false},
    complains: {type: String, required: false}
});

module.exports = mongoose.model("messages", messages);