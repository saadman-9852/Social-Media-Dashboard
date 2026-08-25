const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const { getUnreadCount, markAllRead, getRecentFromCache } = require('../utils/notificationService');

// @route  GET /api/notifications  (paginated full history from MongoDB)
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username displayName avatarUrl')
    .populate('post', 'mediaUrl caption');

  const unreadCount = await getUnreadCount(req.user._id);

  res.status(200).json({ success: true, notifications, unreadCount });
});

// @route  GET /api/notifications/recent  (fast path, straight from Redis cache)
const getRecentNotifications = asyncHandler(async (req, res) => {
  const notifications = await getRecentFromCache(req.user._id);
  const unreadCount = await getUnreadCount(req.user._id);
  res.status(200).json({ success: true, notifications, unreadCount });
});

// @route  PUT /api/notifications/read-all
const markNotificationsRead = asyncHandler(async (req, res) => {
  await markAllRead(req.user._id);
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { getNotifications, getRecentNotifications, markNotificationsRead };
