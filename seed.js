/**
 * Seeds the database with demo users and posts for local development.
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');

const demoUsers = [
  { username: 'ava_codes', displayName: 'Ava Chen', email: 'ava@example.com', password: 'password123', bio: 'Frontend dev. Coffee enthusiast.' },
  { username: 'marco_design', displayName: 'Marco Reyes', email: 'marco@example.com', password: 'password123', bio: 'Product designer.' },
  { username: 'priya.codes', displayName: 'Priya Patel', email: 'priya@example.com', password: 'password123', bio: 'Building things on the internet.' },
];

const samplePosts = [
  'Just shipped a new feature after a long week!',
  'Anyone else deep in a Socket.IO rabbit hole tonight?',
  'Redis pub/sub is genuinely elegant once it clicks.',
  'Coffee, code, repeat.',
  'Excited to share what we have been building.',
];

async function seed() {
  await connectDB();
  console.log('[Seed] Clearing existing demo data...');
  await User.deleteMany({ email: { $in: demoUsers.map((u) => u.email) } });

  console.log('[Seed] Creating users...');
  const createdUsers = [];
  for (const userData of demoUsers) {
    const user = await User.create(userData);
    createdUsers.push(user);
  }

  // Everyone follows everyone for a populated demo feed
  for (const user of createdUsers) {
    user.following = createdUsers.filter((u) => u._id !== user._id).map((u) => u._id);
    user.followers = createdUsers.filter((u) => u._id !== user._id).map((u) => u._id);
    await user.save();
  }

  console.log('[Seed] Creating posts...');
  for (const user of createdUsers) {
    for (let i = 0; i < 3; i += 1) {
      await Post.create({
        author: user._id,
        caption: samplePosts[Math.floor(Math.random() * samplePosts.length)],
        likes: createdUsers.filter(() => Math.random() > 0.4).map((u) => u._id),
        viewCount: Math.floor(Math.random() * 500),
      });
    }
  }

  console.log('[Seed] Done. Demo login: ava@example.com / password123');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
