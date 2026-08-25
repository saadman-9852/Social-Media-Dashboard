const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @route  GET /api/messages/conversations
const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'username displayName avatarUrl')
    .populate('lastMessage');

  res.status(200).json({ success: true, conversations });
});

// @route  POST /api/messages/conversations  { participantId }
const startConversation = asyncHandler(async (req, res) => {
  const { participantId } = req.body;

  if (!participantId) {
    res.status(400);
    throw new Error('participantId is required');
  }

  let conversation = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [req.user._id, participantId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
    });
  }

  const populated = await conversation.populate('participants', 'username displayName avatarUrl');
  res.status(200).json({ success: true, conversation: populated });
});

// @route  GET /api/messages/conversations/:id/messages?page=1
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 30;
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findById(id);
  if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
    res.status(403);
    throw new Error('Not authorized to view this conversation');
  }

  const messages = await Message.find({ conversation: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username displayName avatarUrl');

  res.status(200).json({ success: true, messages: messages.reverse() });
});

module.exports = { getConversations, startConversation, getMessages };
