const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');

// Middleware to check if user is logged in, redirect to login with redirect URL if not
const checkCartAccess = (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login?redirect=/account?tab=cart');
  }
  res.redirect('/account?tab=cart');
};

// Cart page - check if logged in
router.get('/', checkCartAccess);

// Add to cart - ALLOW unauthenticated users (store in session)
router.post('/add', cartController.addToCart);
router.put('/update', cartController.updateCartItem);
router.delete('/remove', cartController.removeFromCart);

module.exports = router;

