const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  phone: { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  date: {
    type: Date,
    default: Date.now,
  },
});

// Perubahan di sini: Cek dulu apakah model 'user' sudah ada
// Jika sudah ada, gunakan yang itu. Jika belum, buat yang baru.
module.exports = mongoose.models.user || mongoose.model('user', UserSchema);