const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const aiService = require('../services/aiService');
const toolService = require('../services/toolService');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

/**
 * Simple logger utility for debugging and monitoring
 */
const logger = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
    debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || '')
};

/**
 * GET /chat - Render chatbot page
 */
exports.getChatbot = async(req, res) => {
    res.render('chatbot', {
        title: 'Chat Assistant — SheenClassics'
    });
};

/**
 * POST /chat/message - Main orchestration for hybrid chatbot
 * Flow: Intent Detection → AI Fallback → Tool Execution → Response
 */
exports.sendMessage = async(req, res) => {
        try {
            const message = req.body.message ?.trim();
            const conversationHistory = (req.body.history || [])
                .filter(item => item && item.content)
                .map(item => ({
                    role: item.role === 'bot' ? 'assistant' : item.role,
                    content: item.content
                }))
                .filter(item => ['user', 'assistant'].includes(item.role))
                .slice(-10);

            if (!message) {
                return res.json({
                    success: false,
                    reply: 'Please type a question or request so I can help.'
                });
            }

            const userId = req.session ?.userId || null;
            logger.info(`Received message from user ${userId || 'guest'}: "${message}"`);

            let reply, source, toolsUsed = [];

            // Live Groq AI handles the conversation; tools provide store data when needed.
            logger.debug('Calling AI service with context');
            const contextData = await prepareContextData(userId);

            const aiResult = await aiService.chat(
                message,
                conversationHistory,
                5, // maxIterations
                contextData
            );

            if (!aiResult.success) {
                logger.error('AI service failed:', aiResult.error);
                return res.json({
                    success: false,
                    reply: 'Sorry, I encountered an issue processing your request. Please try again.'
                });
            }

            // STEP 3: Execute tools if AI provided function calls
            if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
                logger.debug(`STEP 3: Processing ${aiResult.toolCalls.length} tool calls`);

                const toolResults = [];
                for (const toolCall of aiResult.toolCalls) {
                    logger.debug(`Executing tool: ${toolCall.name}`, toolCall.arguments);

                    // Inject userId into tool arguments
                    const toolArgs = {
                        ...toolCall.arguments,
                        userId: userId,
                        sessionId: req.sessionID,
                        isAdmin: Boolean(req.session ?.isAdmin),
                        allowedOrderId: req.session ?.allowedOrderId
                    };

                    const toolResult = await toolService.executeTool(
                        toolCall.name,
                        toolArgs
                    );

                    if (toolCall.name === 'placeOrder' && toolResult.success && toolResult.orderId) {
                        req.session.allowedOrderId = toolResult.orderId;
                    }

                    toolResults.push({
                        tool: toolCall.name,
                        arguments: toolCall.arguments,
                        result: toolResult
                    });

                    toolsUsed.push(toolCall.name);
                    logger.debug(`Tool result: ${toolCall.name}`, toolResult);
                }

                // STEP 4: Follow-up AI call with tool results context
                logger.debug('STEP 4: Calling AI again with tool results');

                const followUpHistory = [
                    ...conversationHistory,
                    { role: 'user', content: message },
                    { role: 'assistant', content: aiResult.response || '' }
                ];

                const toolContextMessage = `
Tool Results:
${toolResults.map(tr => `- ${tr.tool}: ${JSON.stringify(tr.result)}`).join('\n')}

Please provide a helpful response based on these results.
            `.trim();

            const followUpResult = await aiService.chat(
                toolContextMessage,
                followUpHistory,
                5,  // maxIterations
                contextData,
                false
            );

            if (followUpResult.success) {
                reply = followUpResult.response;
                source = 'ai-with-tools';
                logger.info(`Generated AI response with tool results`);
            } else {
                reply = aiResult.response || 'I was unable to complete your request.';
                source = 'ai';
                logger.error('Follow-up AI call failed');
            }
        } else {
            // No tool calls needed
            reply = aiResult.response;
            source = 'ai';
            logger.info('Generated AI response without tools');
        }

        logger.debug('Returning response', { source, toolsUsed: toolsUsed.length });

        return res.json({ 
            success: true, 
            reply, 
            source,
            toolsUsed 
        });

    } catch (error) {
        logger.error('Chatbot error:', error);
        res.json({ 
            success: false, 
            reply: 'Sorry, something went wrong while processing your request. Please try again later.' 
        });
    }
};

/**
 * Prepare context data for RAG injection into AI prompts
 */
async function prepareContextData(userId) {
    try {
        const context = {
            recentOrders: [],
            cartItems: [],
            userProfile: {},
            availableProducts: []
        };

        // Get user's recent orders
        if (userId) {
            const orders = await Order.find({ user: userId })
                .populate('items.product')
                .sort({ createdAt: -1 })
                .limit(3);
            context.recentOrders = orders.map(o => ({
                id: o._id,
                status: o.status,
                total: o.totalAmount,
                items: o.items.map(i => ({ name: i.product?.name, qty: i.quantity }))
            }));

            // Get user's cart
            const cart = await Cart.findOne({ user: userId }).populate('items.product');
            if (cart) {
                context.cartItems = cart.items.map(i => ({ 
                    name: i.product?.name, 
                    qty: i.quantity 
                }));
            }
        }

        // Get available products for context (top 5 by category)
        const products = await Product.find({ stock: { $gt: 0 } })
            .select('name category price slug')
            .limit(5);
        context.availableProducts = products.map(p => ({
            name: p.name,
            category: p.category,
            price: p.price,
            link: `${SITE_URL}/products/${p.slug || p._id}`
        }));

        return context;
    } catch (error) {
        logger.error('Error preparing context data:', error);
        return {};
    }
}

/**
 * GET /chat/history - Retrieve chat history (optional, for persistence)
 */
exports.getChatHistory = async(req, res) => {
    try {
        // Currently using client-side sessionStorage
        // Implement database persistence here if needed (v2)
        res.json({ success: true, history: [] });
    } catch (error) {
        logger.error('Error retrieving chat history:', error);
        res.json({ success: false, history: [] });
    }
};

/**
 * POST /chat/clear - Clear chat history
 */
exports.clearChatHistory = async(req, res) => {
    try {
        // Currently using client-side sessionStorage
        // Implement database persistence clear here if needed (v2)
        res.json({ success: true, message: 'Chat history cleared.' });
    } catch (error) {
        logger.error('Error clearing chat history:', error);
        res.json({ success: false, message: 'Error clearing history.' });
    }
};
