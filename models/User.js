// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  profilePicture: { type: String, default: "" },
  first_name:       { type: String, required: true },
  last_name:        { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  phone:            { type: String },
  address:          { type: String },
  medical_history:  { type: String }
});

module.exports = mongoose.model('User', userSchema);
