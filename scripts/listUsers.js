const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sheenclassics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected\n');
  
  try {
    const users = await User.find().select('name email isAdmin createdAt').sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('No users found.\n');
      process.exit(0);
    }
    
    console.log('All Users:');
    console.log('='.repeat(80));
    console.log(`${'Name'.padEnd(30)} ${'Email'.padEnd(30)} ${'Admin'.padEnd(10)} ${'Created'}`);
    console.log('-'.repeat(80));
    
    users.forEach(user => {
      const name = (user.name || 'N/A').padEnd(30);
      const email = (user.email || 'N/A').padEnd(30);
      const admin = (user.isAdmin ? 'Yes' : 'No').padEnd(10);
      const created = new Date(user.createdAt).toLocaleDateString();
      console.log(`${name} ${email} ${admin} ${created}`);
    });
    
    console.log('='.repeat(80));
    console.log(`\nTotal users: ${users.length}`);
    console.log(`Admin users: ${users.filter(u => u.isAdmin).length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

