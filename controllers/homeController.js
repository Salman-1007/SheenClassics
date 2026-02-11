const Product = require('../models/Product');
const User = require('../models/User');

exports.getHome = async (req, res) => {
  try {
    const featuredProducts = await Product.find({ featured: true }).limit(8);
    const newProducts = await Product.find().sort({ createdAt: -1 }).limit(8);
    
    let user = null;
    if (req.session.userId) {
      user = await User.findById(req.session.userId);
    }
    
    res.render('home', {
      title: 'Home - SheenClassics',
      featuredProducts,
      newProducts,
      user
    });
  } catch (error) {
    console.error('Error fetching home page:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load home page'
    });
  }
};

