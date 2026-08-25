const express = require('express');
const {
  getOverview,
  getEngagementOverTime,
  getTopPosts,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', protect, getOverview);
router.get('/engagement-over-time', protect, getEngagementOverTime);
router.get('/top-posts', protect, getTopPosts);

module.exports = router;
