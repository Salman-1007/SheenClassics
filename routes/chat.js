const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/', chatController.getChatbot);
router.post('/message', chatController.sendMessage);
router.post('/api', (req, res, next) => {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
    req.body.message = lastUserMessage ? lastUserMessage.content : req.body.message;
    req.body.history = messages.slice(0, -1);
    chatController.sendMessage(req, res, next);
});

module.exports = router;
