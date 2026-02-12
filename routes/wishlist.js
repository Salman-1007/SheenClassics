const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth');

// Middleware to check if user is logged in, redirect to login with redirect URL if not
const checkWishlistAccess = (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login?redirect=/account?tab=wishlist');
  }
  res.redirect('/account?tab=wishlist');
};

// Wishlist page - check if logged in
router.get('/', checkWishlistAccess);

// Add to wishlist - ALLOW unauthenticated users (store in session)
router.post('/add', wishlistController.addToWishlist);
router.delete('/remove', wishlistController.removeFromWishlist);

module.exports = router;

