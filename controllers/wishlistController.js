const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

exports.getWishlist = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    // Redirect to account page with wishlist tab
    return res.redirect('/account?tab=wishlist');
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load wishlist'
    });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: 'Please login first' });
    }
    
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: req.session.userId });
    
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.session.userId, products: [] });
    }
    
    if (wishlist.products.includes(productId)) {
      return res.json({ success: false, message: 'Product already in wishlist' });
    }
    
    wishlist.products.push(productId);
    await wishlist.save();
    
    res.json({ success: true, message: 'Product added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.json({ success: false, message: 'Failed to add product to wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const wishlist = await Wishlist.findOne({ user: req.session.userId });
    
    if (!wishlist) {
      return res.json({ success: false, message: 'Wishlist not found' });
    }
    
    wishlist.products = wishlist.products.filter(
      id => id.toString() !== productId
    );
    await wishlist.save();
    
    res.json({ success: true, message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.json({ success: false, message: 'Failed to remove product from wishlist' });
  }
};

