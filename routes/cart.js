const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');

// Cart page redirects to account with cart tab
router.get('/', isAuthenticated, (req, res) => {
  res.redirect('/account?tab=cart');
});

router.post('/add', isAuthenticated, cartController.addToCart);
router.put('/update', isAuthenticated, cartController.updateCartItem);
router.delete('/remove', isAuthenticated, cartController.removeFromCart);

module.exports = router;

