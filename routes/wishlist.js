const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { isAuthenticated } = require('../middleware/auth');

// Wishlist page redirects to account with wishlist tab
router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/account?tab=wishlist');
});

router.post('/add', isAuthenticated, wishlistController.addToWishlist);
router.delete('/remove', isAuthenticated, wishlistController.removeFromWishlist);

module.exports = router;

