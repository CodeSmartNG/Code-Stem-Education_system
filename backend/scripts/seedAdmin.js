const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'codesmartng1@gmail.com' });
    if (existingAdmin) {
      console.log('✅ Admin already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      process.exit(0);
    }

    // Create admin with SIMPLE password (no special chars)
    const admin = await User.create({
      name: 'Kabir Alkasim',
      email: 'codesmartng1@gmail.com',
      password: 'Admin@1234',  // ← SIMPLER password for testing
      role: 'admin',
      isVerified: true,
      isApproved: true
    });

    console.log('✅ Admin created successfully!');
    console.log('📧 Email: codesmartng1@gmail.com');
    console.log('🔑 Password: Admin@1234');
    console.log(`🆔 User ID: ${admin._id}`);
    console.log(`👤 Name: ${admin.name}`);
    console.log(`🎭 Role: ${admin.role}`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    if (error.code === 11000) {
      console.log('⚠️ Duplicate email detected. Admin might already exist.');
    }
    process.exit(1);
  }
};

seedAdmin();