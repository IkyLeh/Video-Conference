const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `recording-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Endpoint POST untuk menerima file rekaman
router.post('/', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

module.exports = router;
