const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', accountController.getAccount);
router.post('/update', isAuthenticated, accountController.updateAccount);

module.exports = router;

