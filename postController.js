const asyncHandler = require('express-async-handler');
const streamifier = require('streamifier');
const Post = require('../models/Post');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { createNotification } = require('../utils/notificationService');
const { redisClient, keys } = require('../config/redis');

const streamUpload = (buffer, folder, resourceType = 'auto') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => (result ? resolve(result) : reject(err))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// @route  POST /api/posts
const createPost = asyncHandler(async (req, res) => {
  const { caption } = req.body;
  let mediaUrl = '';
  let mediaPublicId = '';
  let mediaType = 'none';

  if (req.file) {
    const result = await streamUpload(req.file.buffer, 'social-dashboard/posts');
    mediaUrl = result.secure_url;
    mediaPublicId = result.public_id;
    mediaType = result.resource_type === 'video' ? 'video' : 'image';
  }

  if (!caption && !mediaUrl) {
    res.status(400);
    throw new Error('A post needs a caption or media');
  }

  const post = await Post.create({
    author: req.user._id,
    caption,
    mediaUrl,
    mediaPublicId,
    mediaType,
  });

  // Invalidate cached feeds for this user's followers since there's new content.
  // (In production this might be a queued fan-out job rather than inline.)
  await redisClient.del(keys.feedCache(req.user._id));

  const populated = await post.populate('author', 'username displayName avatarUrl');
  res.status(201).json({ success: true, post: populated });
});

// @route  GET /api/posts/feed  (posts from users I follow + my own, paginated)
const getFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const authorIds = [...req.user.following, req.user._id];

  const posts = await Post.find({ author: { $in: authorIds } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username displayName avatarUrl')
    .populate('comments.author', 'username displayName avatarUrl');

  const total = await Post.countDocuments({ author: { $in: authorIds } });

  res.status(200).json({
    success: true,
    posts,
    pagination: { page, limit, total, hasMore: skip + posts.length < total },
  });
});

// @route  POST /api/posts/:id/like
const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const alreadyLiked = post.likes.some((id) => String(id) === String(req.user._id));

  if (alreadyLiked) {
    post.likes.pull(req.user._id);
  } else {
    post.likes.push(req.user._id);
  }
  await post.save();

  if (!alreadyLiked) {
    await createNotification({
      recipientId: post.author,
      senderId: req.user._id,
      type: 'like',
      postId: post._id,
      message: `${req.user.displayName} liked your post`,
    });
  }

  res.status(200).json({ success: true, liked: !alreadyLiked, likeCount: post.likes.length });
});

// @route  POST /api/posts/:id/comments
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) {
    res.status(400);
    throw new Error('Comment text is required');
  }

  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  post.comments.push({ author: req.user._id, text: text.trim() });
  await post.save();

  await createNotification({
    recipientId: post.author,
    senderId: req.user._id,
    type: 'comment',
    postId: post._id,
    message: `${req.user.displayName} commented on your post`,
  });

  const populated = await post.populate('comments.author', 'username displayName avatarUrl');
  res.status(201).json({ success: true, comments: populated.comments });
});

// @route  DELETE /api/posts/:id
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  if (String(post.author) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to delete this post');
  }

  if (post.mediaPublicId) {
    await cloudinary.uploader.destroy(post.mediaPublicId).catch(() => {});
  }

  await post.deleteOne();
  res.status(200).json({ success: true, message: 'Post deleted' });
});

module.exports = { createPost, getFeed, toggleLike, addComment, deletePost };
