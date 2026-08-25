const express = require('express');
const {
  getNotifications,
  getRecentNotifications,
  markNotificationsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getNotifications);
router.get('/recent', protect, getRecentNotifications);
router.put('/read-all', protect, markNotificationsRead);

module.exports = router;
