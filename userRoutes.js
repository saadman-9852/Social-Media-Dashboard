const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  followUser,
  searchUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/search', protect, searchUsers);
router.put('/me', protect, updateProfile);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/:id/follow', protect, followUser);
router.get('/:username', protect, getProfile);

module.exports = router;
