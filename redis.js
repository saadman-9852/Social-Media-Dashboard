const Redis = require('ioredis');

/**
 * We create three separate Redis connections:
 *  - redisClient: general purpose GET/SET (caching, presence, notification lists)
 *  - redisPub:    dedicated publisher (pub/sub)
 *  - redisSub:    dedicated subscriber (pub/sub) — ioredis requires a separate
 *                 connection for subscribing since a subscribed connection can
 *                 only issue subscribe-related commands.
 */
const createClient = (label) => {
  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  client.on('connect', () => console.log(`[Redis:${label}] connected`));
  client.on('error', (err) => console.error(`[Redis:${label}] error: ${err.message}`));

  return client;
};

const redisClient = createClient('client');
const redisPub = createClient('publisher');
const redisSub = createClient('subscriber');

// Namespaced key helpers so we don't collide across features
const keys = {
  userPresence: (userId) => `presence:${userId}`,
  userNotifications: (userId) => `notifications:${userId}`,
  unreadCount: (userId) => `notifications:unread:${userId}`,
  feedCache: (userId) => `cache:feed:${userId}`,
  analyticsCache: (scope) => `cache:analytics:${scope}`,
};

const CHANNELS = {
  NOTIFICATIONS: 'channel:notifications',
};

module.exports = { redisClient, redisPub, redisSub, keys, CHANNELS };
