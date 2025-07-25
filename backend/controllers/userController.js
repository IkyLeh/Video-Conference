// backend/controllers/userController.js
const User = require("../models/user");

// @desc    Ambil data profil user
// @route   GET /api/users/me
const getUserProfile = async (req, res) => {
  try {
    // req.user.id didapat dari middleware
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update data profil user
// @route   PUT /api/users/me
const updateUserProfile = async (req, res) => {
  const { name, phone } = req.body; // Kita mulai dengan nama dulu

  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = name || user.name; // Ganti nama jika ada di body request
      user.phone = phone !== undefined ? phone : user.phone;
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ msg: 'User tidak ditemukan' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const uploadAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User tidak ditemukan' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: 'Tidak ada file yang diunggah' });
    }

    // Path file akan terlihat seperti 'uploads/namafile.jpg'
    user.avatar = `/${req.file.path.replace(/\\/g, "/")}`; // Ganti backslash dengan forward slash untuk kompatibilitas URL

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { getUserProfile, updateUserProfile, uploadAvatar };