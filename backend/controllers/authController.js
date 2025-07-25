// backend/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: "Username sudah ada" });

    user = new User({ username, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Kredensial tidak valid" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Kredensial tidak valid" });

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ msg: 'Pengguna dengan email tersebut tidak ditemukan.' });
    }

    // Buat token reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 jam
    await user.save();

    // Konfigurasi transporter Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Buat link reset
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Opsi email
    const mailOptions = {
      to: user.username,
     from: `"Obrol.in" <${process.env.EMAIL_USER}>`,
      subject: 'Reset Password Akun Video Conference',
      text: `Anda menerima email ini karena Anda (atau orang lain) meminta untuk mereset password akun Anda.\n\n` +
            `Silakan klik link berikut, atau salin ke browser Anda untuk menyelesaikan proses:\n\n` +
            `${resetUrl}\n\n` +
            `Jika Anda tidak meminta ini, silakan abaikan email ini dan password Anda akan tetap sama.\n`,
    };

    // Kirim email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ msg: 'Email pemulihan telah dikirim.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    // Cari user dengan token yang valid dan belum kadaluwarsa
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Token reset password tidak valid atau sudah kadaluwarsa.' });
    }

    // Set password baru
    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password berhasil direset.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};