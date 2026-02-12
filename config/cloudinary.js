const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Validate Cloudinary configuration on startup
if (!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET) {
    console.warn('⚠️  Cloudinary environment variables are not set. Image uploads will not work.');
    console.warn('Please set CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET in your .env file');
}

module.exports = cloudinary;