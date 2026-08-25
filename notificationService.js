const Notification = require('../models/Notification');
const { redisClient, redisPub, keys, CHANNELS } = require('../config/redis');

/**
 * Creates a notification, persists it to MongoDB for history/pagination,
 * increments a Redis unread counter for O(1) badge reads, and publishes
 * to a Redis pub/sub channel so ANY server instance (horizontally scaled)
 * can push it to the recipient's connected socket(s) — not just the
 * instance that handled the originating HTTP request.
 *
 * This pub/sub hop is what makes the notification system horizontally
 * scalable: without it, a user connected to server B would never see
 * a notification triggered by an action handled on server A.
 */
async function createNotification({ recipientId, senderId, type, postId = null, message }) {
  if (String(recipientId) === String(senderId)) {
    // Don't notify users about their own actions (e.g. liking your own post)
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    post: postId,
    message,
  });

  const populated = await notification.populate('sender', 'username displayName avatarUrl');

  // Redis: bump the unread badge counter (fast path, no Mongo count() needed on every page load)
  await redisClient.incr(keys.unreadCount(recipientId));

  // Redis: push onto a capped recent-notifications list for quick "last 20" reads without hitting Mongo
  const payload = JSON.stringify({
    id: populated._id,
    type: populated.type,
    message: populated.message,
    post: populated.post,
    sender: {
      id: populated.sender._id,
      username: populated.sender.username,
      displayName: populated.sender.displayName,
      avatarUrl: populated.sender.avatarUrl,
    },
    createdAt: populated.createdAt,
  });

  await redisClient.lpush(keys.userNotifications(recipientId), payload);
  await redisClient.ltrim(keys.userNotifications(recipientId), 0, 49); // keep latest 50

  // Publish for real-time fan-out across all server instances
  await redisPub.publish(
    CHANNELS.NOTIFICATIONS,
    JSON.stringify({ recipientId: String(recipientId), notification: JSON.parse(payload) })
  );

  return populated;
}

async function getUnreadCount(userId) {
  const count = await redisClient.get(keys.unreadCount(userId));
  return count ? parseInt(count, 10) : 0;
}

async function markAllRead(userId) {
  await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
  await redisClient.set(keys.unreadCount(userId), 0);
}

async function getRecentFromCache(userId) {
  const cached = await redisClient.lrange(keys.userNotifications(userId), 0, 19);
  return cached.map((item) => JSON.parse(item));
}

module.exports = { createNotification, getUnreadCount, markAllRead, getRecentFromCache };
