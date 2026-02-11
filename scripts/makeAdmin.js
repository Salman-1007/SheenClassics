const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sheenclassics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  // Get email from command line argument
  const email = process.argv[2];
  
  if (!email) {
    console.log('\nUsage: node scripts/makeAdmin.js <user-email>');
    console.log('Example: node scripts/makeAdmin.js admin@example.com\n');
    process.exit(1);
  }
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`\n❌ User with email "${email}" not found.\n`);
      process.exit(1);
    }
    
    if (user.isAdmin) {
      console.log(`\n✅ User "${user.name}" (${user.email}) is already an admin.\n`);
      process.exit(0);
    }
    
    user.isAdmin = true;
    await user.save();
    
    console.log(`\n✅ Successfully made "${user.name}" (${user.email}) an admin!\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
    process.exit(1);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

