const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI in the environment.
 * Exits the process on failure so process managers (pm2, docker) can restart cleanly.
 */
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose (6+/8+) no longer needs useNewUrlParser / useUnifiedTopology,
      // they're kept out intentionally to avoid deprecation warnings.
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Attempting to reconnect is handled by the driver.');
    });
  } catch (error) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
