// backend/scripts/seedUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - remove this line if you want to keep existing)
    // await User.deleteMany({});
    // console.log('🗑️  Cleared existing users');

    const users = [
      {
        name: 'Kabir Alkasim',
        email: 'codesmartng1@gmail.com',
        password: 'Admin@1234',
        role: 'admin',
        isVerified: true,
        isApproved: true
      },
      {
        name: 'Teacher User',
        email: 'kabiralkasim6@gmail.com',
        password: 'Admin@1234',
        role: 'teacher',
        isVerified: true,
        isApproved: true
      },
      {
        name: 'Student User',
        email: 'kabiralkasim9@gmail.com',
        password: 'Admin@1234',
        role: 'student',
        isVerified: true,
        isApproved: true
      }
    ];

    for (const userData of users) {
      // Check if user exists
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        continue;
      }

      // Create user (password will be hashed by User model's pre-save hook)
      const user = await User.create(userData);
      
      console.log(`✅ Created ${userData.role}: ${user.email}`);
    }

    console.log('\n🎉 All users created successfully!');
    console.log('═══════════════════════════════════');
    console.log('📧 Admin:   codesmartng1@gmail.com');
    console.log('🔑 Password: Admin@1234');
    console.log('═══════════════════════════════════');
    console.log('📧 Teacher: kabiralkasim6@gmail.com');
    console.log('🔑 Password: Admin@1234');
    console.log('═══════════════════════════════════');
    console.log('📧 Student: kabiralkasim9@gmail.com');
    console.log('🔑 Password: Admin@1234');
    console.log('═══════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedUsers();