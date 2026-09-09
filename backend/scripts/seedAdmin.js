const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@stem.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    // Create admin
    const admin = await User.create({
      name: 'Kabir Alkasim',
      email: 'codesmartng1@gmail.com',
      password: 'Kb1217@#$%&',
      role: 'admin',
      isVerified: true,
      isApproved: true
    });

    console.log('✅ Admin created successfully!');
    console.log('Email: codesmart ng1@gmail.com');
    console.log('Password: Kb1217@#$%&');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();