const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const multer = require('multer');

require('../config/cloudinary');

// Use memory storage - files will be uploaded to Cloudinary in controller
const storage = multer.memoryStorage();

// File filter for image types
function fileFilter(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only jpg, jpeg, png files are allowed!'));
    }
}

// Multer configuration with memory storage
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/dashboard', isAdmin, adminController.getDashboard);
router.get('/products', isAdmin, adminController.getProducts);
router.get('/products/add', isAdmin, adminController.getAddProduct);
router.post('/products/add', isAdmin, upload.single('image'), adminController.postAddProduct);
router.get('/products/:id/edit', isAdmin, adminController.getEditProduct);
router.post('/products/:id/edit', isAdmin, adminController.postEditProduct);
router.delete('/products/:id', isAdmin, adminController.deleteProduct);
router.get('/orders', isAdmin, adminController.getOrders);
router.put('/orders/:id/status', isAdmin, adminController.updateOrderStatus);
router.get('/coupons', isAdmin, adminController.getCoupons);
router.post('/coupons/add', isAdmin, adminController.postAddCoupon);
router.get('/users', isAdmin, adminController.getUsers);

module.exports = router;