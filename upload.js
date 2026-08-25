const multer = require('multer');

// Store the file in memory as a buffer; the controller streams it to Cloudinary.
// This avoids writing temp files to disk, which matters on ephemeral hosts (Render, Heroku, etc).
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB cap — adjust for video-heavy use cases
  },
});

module.exports = upload;
