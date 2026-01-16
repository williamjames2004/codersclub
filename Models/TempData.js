const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
    admin_id: {type: String, required: true},
    password: {type: String, required: true}
});

module.exports = mongoose.model("tempdata", dataSchema);