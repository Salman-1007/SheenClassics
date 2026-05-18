const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

router.get('/:slug', blogController.getBlog);

module.exports = router;
