const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');

router.get('/dashboard', isAdmin, adminController.getDashboard);
router.get('/products', isAdmin, adminController.getProducts);
router.get('/products/add', isAdmin, adminController.getAddProduct);
router.post('/products/add', isAdmin, adminController.postAddProduct);
router.get('/products/:id/edit', isAdmin, adminController.getEditProduct);
router.post('/products/:id/edit', isAdmin, adminController.postEditProduct);
router.delete('/products/:id', isAdmin, adminController.deleteProduct);
router.get('/orders', isAdmin, adminController.getOrders);
router.put('/orders/:id/status', isAdmin, adminController.updateOrderStatus);
router.get('/coupons', isAdmin, adminController.getCoupons);
router.post('/coupons/add', isAdmin, adminController.postAddCoupon);

module.exports = router;

