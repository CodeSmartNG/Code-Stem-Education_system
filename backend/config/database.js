// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds to find a server
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Ping to confirm connection
    await conn.connection.db.admin().command({ ping: 1 });
    console.log('✅ MongoDB ping successful!');

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('👉 Common fixes:');
    console.error('   1. Whitelist IP in MongoDB Atlas (allow 0.0.0.0/0 for Render)');
    console.error('   2. Check MONGO_URI in .env');
    console.error('   3. Check MongoDB password');
    // Don't exit in production; Render will retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
