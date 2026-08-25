const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caption: { type: String, trim: true, maxlength: 2200, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaPublicId: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    // Denormalized counters for fast analytics reads without aggregation on every request
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

postSchema.pre('save', function syncCounters(next) {
  this.likeCount = this.likes.length;
  this.commentCount = this.comments.length;
  next();
});

module.exports = mongoose.model('Post', postSchema);
