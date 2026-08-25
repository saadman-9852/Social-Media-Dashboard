const express = require('express');
const {
  createPost,
  getFeed,
  toggleLike,
  addComment,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/feed', protect, getFeed);
router.post('/', protect, upload.single('media'), createPost);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comments', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;
