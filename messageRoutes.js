const express = require('express');
const {
  getConversations,
  startConversation,
  getMessages,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, startConversation);
router.get('/conversations/:id/messages', protect, getMessages);

module.exports = router;
