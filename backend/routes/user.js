// backend/routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getUserProfile, updateUserProfile, uploadAvatar } = require('../controllers/userController');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder penyimpanan
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${require('path').extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

router.get('/me', auth, getUserProfile);
router.put('/me', auth, updateUserProfile);
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);

module.exports = router;
