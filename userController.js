const asyncHandler = require('express-async-handler');
const streamifier = require('streamifier');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { createNotification } = require('../utils/notificationService');

// @route  GET /api/users/:username
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .populate('followers', 'username displayName avatarUrl')
    .populate('following', 'username displayName avatarUrl');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ success: true, user: user.toSafeObject() });
});

// @route  PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['displayName', 'bio', 'isPrivate'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user: user.toSafeObject() });
});

// Helper to stream a multer buffer up to Cloudinary
const streamUpload = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (err, result) => {
      if (result) resolve(result);
      else reject(err);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// @route  POST /api/users/me/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const result = await streamUpload(req.file.buffer, 'social-dashboard/avatars');

  // Clean up the old avatar asset if one exists
  if (req.user.avatarPublicId) {
    await cloudinary.uploader.destroy(req.user.avatarPublicId).catch(() => {});
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatarUrl: result.secure_url, avatarPublicId: result.public_id },
    { new: true }
  );

  res.status(200).json({ success: true, user: user.toSafeObject() });
});

// @route  POST /api/users/:id/follow
const followUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  if (String(targetId) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot follow yourself');
  }

  const target = await User.findById(targetId);
  if (!target) {
    res.status(404);
    throw new Error('User not found');
  }

  const alreadyFollowing = target.followers.some((f) => String(f) === String(req.user._id));

  if (alreadyFollowing) {
    target.followers.pull(req.user._id);
    req.user.following.pull(targetId);
  } else {
    target.followers.push(req.user._id);
    req.user.following.push(targetId);
  }

  await target.save();
  await req.user.save();

  if (!alreadyFollowing) {
    await createNotification({
      recipientId: target._id,
      senderId: req.user._id,
      type: 'follow',
      message: `${req.user.displayName} started following you`,
    });
  }

  res.status(200).json({
    success: true,
    following: !alreadyFollowing,
    followerCount: target.followers.length,
  });
});

// @route  GET /api/users/search?q=
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json({ success: true, users: [] });

  const users = await User.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .select('username displayName avatarUrl bio');

  res.status(200).json({ success: true, users });
});

module.exports = { getProfile, updateProfile, uploadAvatar, followUser, searchUsers };
