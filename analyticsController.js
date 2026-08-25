const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const { redisClient, keys } = require('../config/redis');

const CACHE_TTL_SECONDS = 300; // 5 minutes — analytics don't need to be second-fresh

// @route  GET /api/analytics/overview
// Returns totals + engagement rate for the logged-in user's own content
const getOverview = asyncHandler(async (req, res) => {
  const cacheKey = keys.analyticsCache(`overview:${req.user._id}`);
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, cached: true, ...JSON.parse(cached) });
  }

  const userId = req.user._id;

  const [totals] = await Post.aggregate([
    { $match: { author: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        postCount: { $sum: 1 },
        totalLikes: { $sum: '$likeCount' },
        totalComments: { $sum: '$commentCount' },
        totalViews: { $sum: '$viewCount' },
      },
    },
  ]);

  const user = await User.findById(userId).select('followers following');

  const result = {
    postCount: totals?.postCount || 0,
    totalLikes: totals?.totalLikes || 0,
    totalComments: totals?.totalComments || 0,
    totalViews: totals?.totalViews || 0,
    followerCount: user.followers.length,
    followingCount: user.following.length,
    engagementRate:
      totals && totals.postCount > 0
        ? Number(
            (((totals.totalLikes + totals.totalComments) / (totals.postCount * (user.followers.length || 1))) * 100).toFixed(2)
          )
        : 0,
  };

  await redisClient.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  res.status(200).json({ success: true, cached: false, ...result });
});

// @route  GET /api/analytics/engagement-over-time?days=30
const getEngagementOverTime = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const cacheKey = keys.analyticsCache(`timeseries:${req.user._id}:${days}`);
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, cached: true, data: JSON.parse(cached) });
  }

  const data = await Post.aggregate([
    { $match: { author: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        posts: { $sum: 1 },
        likes: { $sum: '$likeCount' },
        comments: { $sum: '$commentCount' },
        views: { $sum: '$viewCount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  await redisClient.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);
  res.status(200).json({ success: true, cached: false, data });
});

// @route  GET /api/analytics/top-posts?limit=5
const getTopPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;

  const posts = await Post.find({ author: req.user._id })
    .sort({ likeCount: -1, commentCount: -1 })
    .limit(limit)
    .select('caption mediaUrl likeCount commentCount viewCount createdAt');

  res.status(200).json({ success: true, posts });
});

module.exports = { getOverview, getEngagementOverTime, getTopPosts };
