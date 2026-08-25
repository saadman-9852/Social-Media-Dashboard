const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { redisClient, redisPub, redisSub, keys, CHANNELS } = require('../config/redis');

// userId -> Set of socket.io socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

function registerSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function unregisterSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Use Redis as the Socket.IO adapter so this works across multiple Node
  // instances behind a load balancer — a message emitted on server A reaches
  // a socket connected to server B.
  io.adapter(createAdapter(redisPub, redisSub.duplicate()));

  // --- Authentication middleware for every socket connection ---
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username displayName avatarUrl');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    registerSocket(userId, socket.id);

    // Join a personal room so we can target this user directly (e.g. `io.to(userId)`)
    socket.join(userId);

    await redisClient.set(keys.userPresence(userId), 'online', 'EX', 120);
    socket.broadcast.emit('presence:update', { userId, status: 'online' });

    console.log(`[Socket] ${socket.user.username} connected (${socket.id})`);

    // --- Messaging: join a conversation room ---
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // --- Messaging: send message ---
    socket.on('message:send', async ({ conversationId, text, mediaUrl }, callback) => {
      try {
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text,
          mediaUrl,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        const populated = await message.populate('sender', 'username displayName avatarUrl');

        io.to(`conversation:${conversationId}`).emit('message:new', populated);
        callback?.({ success: true, message: populated });
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    // --- Typing indicators ---
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // --- Read receipts ---
    socket.on('message:read', async ({ conversationId, messageId }) => {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } });
      socket.to(`conversation:${conversationId}`).emit('message:read', { messageId, userId });
    });

    // --- Presence heartbeat (client pings every ~60s while tab is active) ---
    socket.on('presence:heartbeat', async () => {
      await redisClient.set(keys.userPresence(userId), 'online', 'EX', 120);
    });

    socket.on('disconnect', async () => {
      unregisterSocket(userId, socket.id);
      console.log(`[Socket] ${socket.user.username} disconnected (${socket.id})`);

      // Only broadcast "offline" once ALL of this user's sockets/tabs are gone
      if (!onlineUsers.has(userId)) {
        await redisClient.del(keys.userPresence(userId));
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
        socket.broadcast.emit('presence:update', { userId, status: 'offline' });
      }
    });
  });

  // --- Bridge: Redis pub/sub -> Socket.IO ---
  // Any server process can publish a notification (e.g. from an HTTP route
  // handled by a DIFFERENT instance) and every instance subscribed here will
  // deliver it to the recipient if they're connected locally. This is what
  // makes notifications work correctly behind a horizontally-scaled backend.
  const notificationSub = redisSub.duplicate();
  notificationSub.subscribe(CHANNELS.NOTIFICATIONS, (err) => {
    if (err) console.error('[Redis] Failed to subscribe to notifications channel', err);
  });

  notificationSub.on('message', (channel, message) => {
    if (channel !== CHANNELS.NOTIFICATIONS) return;
    try {
      const { recipientId, notification } = JSON.parse(message);
      io.to(recipientId).emit('notification:new', notification);
    } catch (err) {
      console.error('[Socket] Failed to parse notification pub/sub message', err);
    }
  });

  return io;
}

function isUserOnline(userId) {
  return onlineUsers.has(String(userId));
}

module.exports = { initSocket, isUserOnline };
