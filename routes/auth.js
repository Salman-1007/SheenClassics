const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isNotAuthenticated } = require('../middleware/auth');

router.get('/login', isNotAuthenticated, authController.getLogin);
router.post('/login', isNotAuthenticated, authController.postLogin);
router.get('/signup', isNotAuthenticated, authController.getSignup);
router.post('/signup', isNotAuthenticated, authController.postSignup);
router.post('/logout', authController.logout);

module.exports = router;

