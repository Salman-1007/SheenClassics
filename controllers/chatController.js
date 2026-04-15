const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');

const formatProductList = (products) => {
    if (!products.length) {
        return 'No matching products found right now.';
    }

    return products.map(product => {
        const availability = product.stock > 0 ? 'In stock' : 'Out of stock';
        const productLink = `http://localhost:3000/products/${product.slug || product._id}`;
        return `• [${product.name}](${productLink}) (${product.category}) — Rs.${product.price} — ${availability}`;
    }).join('\n');
};

const extractOrderId = (text) => {
    const match = text.match(/([0-9a-fA-F]{24})/);
    return match ? match[1] : null;
};

const normalizeCategory = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('cloth')) return 'Clothing';
    if (lower.includes('home') || lower.includes('decor')) return 'HomeDecor';
    return null;
};

exports.getChatbot = async(req, res) => {
    res.render('chatbot', {
        title: 'Chat Assistant — SheenClassics'
    });
};

exports.sendMessage = async(req, res) => {
        try {
            const message = req.body.message?.trim();
            if (!message) {
                return res.json({ success: false, reply: 'Please type a question or request so I can help.' });
            }

            const lower = message.toLowerCase();

            // Order tracking
            if (/(where.*order|track.*order|order status|order.*status)/.test(lower)) {
                const orderId = extractOrderId(lower);
                let order;

                if (orderId) {
                    order = await Order.findById(orderId).populate('items.product');
                } else if (req.session.userId) {
                    order = await Order.findOne({ user: req.session.userId }).sort({ createdAt: -1 }).populate('items.product');
                }

                if (!order) {
                    return res.json({
                        success: true,
                        reply: 'I could not find an order. Please provide a valid order ID, or sign in so I can locate your latest order.'
                    });
                }

                const timeline = order.statusHistory && order.statusHistory.length ?
                    order.statusHistory.map(entry => `• ${entry.status} on ${entry.timestamp.toDateString()}${entry.note ? ` — ${entry.note}` : ''}`).join('\n')
                : `Current status: ${order.status}`;

            return res.json({
                success: true,
                reply: `Order ${order._id} is currently ${order.status}.\n${timeline}`
            });
        }

        // Apply coupon
        if (/(apply.*coupon|use.*coupon|coupon code|coupon)/.test(lower)) {
            const couponCodeMatch = lower.match(/(?:coupon|code)[:#]?\s*([A-Za-z0-9-]+)/);
            if (!couponCodeMatch) {
                return res.json({ success: true, reply: 'Sure — please provide the coupon code, for example: "Apply coupon SAVE10".' });
            }

            const code = couponCodeMatch[1].toUpperCase();
            const coupon = await Coupon.findOne({ code });

            if (!coupon || !coupon.isValid()) {
                return res.json({ success: true, reply: `Sorry, the coupon code ${code} is not valid or has expired.` });
            }

            return res.json({
                success: true,
                reply: `The coupon ${code} is valid and gives ${coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `Rs.${coupon.discountValue} off`} on orders above Rs.${coupon.minPurchase}.`
            });
        }

        // Cart assistance
        const addMatch = lower.match(/add .*?(?:product )?id[:#]?\s*([0-9a-fA-F]{24})/);
        if (addMatch) {
            const productId = addMatch[1];
            const quantityMatch = lower.match(/(?:quantity|qty)[:#]?\s*(\d+)/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;
            const product = await Product.findById(productId);

            if (!product) {
                return res.json({ success: true, reply: `I couldn't find a product with ID ${productId}. Please check the ID and try again.` });
            }
            if (product.stock < quantity) {
                return res.json({ success: true, reply: `Only ${product.stock} units of ${product.name} are available.` });
            }

            let cart;
            if (req.session.userId) {
                cart = await Cart.findOne({ user: req.session.userId });
            } else {
                cart = await Cart.findOne({ sessionId: req.sessionID });
            }
            if (!cart) {
                cart = new Cart({
                    user: req.session.userId || null,
                    sessionId: req.session.userId ? null : req.sessionID,
                    items: []
                });
            }

            const existingItem = cart.items.find(item => item.product.toString() === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity, size: '', color: '' });
            }

            await cart.save();
            if (!req.session.userId) req.session.guest = true;

            return res.json({ success: true, reply: `${quantity} x ${product.name} has been added to your cart. Visit your cart to checkout.` });
        }

        // Add product by name keyword
        const addByNameMatch = lower.match(/add\s+(.+?)(?:\s+to\s+cart|\s+to\s+my\s+cart|$)/);
        if (addByNameMatch && !lower.includes('product id')) {
            const productName = addByNameMatch[1].trim();
            const quantityMatch = lower.match(/(?:quantity|qty|x)\s*(\d+)/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;
            
            const product = await Product.findOne({
                $or: [
                    { name: new RegExp(productName, 'i') },
                    { description: new RegExp(productName, 'i') }
                ],
                stock: { $gt: 0 }
            });

            if (!product) {
                return res.json({ success: true, reply: `I couldn't find a product matching "${productName}". Try searching for it or describe what you're looking for.` });
            }

            if (product.stock < quantity) {
                return res.json({ success: true, reply: `Only ${product.stock} units of ${product.name} are available.` });
            }

            let cart;
            if (req.session.userId) {
                cart = await Cart.findOne({ user: req.session.userId });
            } else {
                cart = await Cart.findOne({ sessionId: req.sessionID });
            }
            if (!cart) {
                cart = new Cart({
                    user: req.session.userId || null,
                    sessionId: req.session.userId ? null : req.sessionID,
                    items: []
                });
            }

            const existingItem = cart.items.find(item => item.product.toString() === product._id.toString());
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ product: product._id, quantity, size: '', color: '' });
            }

            await cart.save();
            if (!req.session.userId) req.session.guest = true;

            return res.json({ success: true, reply: `${quantity} x ${product.name} has been added to your cart. Visit your cart to checkout.` });
        }

        const removeMatch = lower.match(/remove .*?(?:product )?id[:#]?\s*([0-9a-fA-F]{24})/);
        if (removeMatch) {
            const productId = removeMatch[1];
            let cart;
            if (req.session.userId) {
                cart = await Cart.findOne({ user: req.session.userId });
            } else {
                cart = await Cart.findOne({ sessionId: req.sessionID });
            }

            if (!cart) {
                return res.json({ success: true, reply: 'Your cart is empty right now. Add a product first and I can help remove it.' });
            }

            const beforeCount = cart.items.length;
            cart.items = cart.items.filter(item => item.product.toString() !== productId);
            if (cart.items.length === beforeCount) {
                return res.json({ success: true, reply: `I could not find product ${productId} in your cart.` });
            }

            await cart.save();
            if (!req.session.userId) req.session.guest = true;
            return res.json({ success: true, reply: `Product ${productId} has been removed from your cart.` });
        }

        // Remove product by name keyword
        const removeByNameMatch = lower.match(/remove\s+(.+?)(?:\s+from\s+cart|\s+from\s+my\s+cart|$)/);
        if (removeByNameMatch && !lower.includes('product id')) {
            const productName = removeByNameMatch[1].trim();
            
            let cart;
            if (req.session.userId) {
                cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
            } else {
                cart = await Cart.findOne({ sessionId: req.sessionID }).populate('items.product');
            }

            if (!cart || !cart.items.length) {
                return res.json({ success: true, reply: 'Your cart is empty right now. Add a product first and I can help remove it.' });
            }

            const itemIndex = cart.items.findIndex(item => 
                item.product.name.toLowerCase().includes(productName.toLowerCase())
            );

            if (itemIndex === -1) {
                return res.json({ success: true, reply: `I couldn't find "${productName}" in your cart.` });
            }

            const removedItem = cart.items[itemIndex];
            cart.items.splice(itemIndex, 1);
            await cart.save();
            
            if (!req.session.userId) req.session.guest = true;
            return res.json({ success: true, reply: `${removedItem.product.name} has been removed from your cart.` });
        }

        // Clear cart with flexible keywords (clear, empty, reset, discard)
        if (/(clear|empty|reset|discard).*(cart|basket)|(cart|basket).*(clear|empty|reset|discard)/.test(lower)) {
            let cart;
            if (req.session.userId) {
                cart = await Cart.findOne({ user: req.session.userId });
            } else {
                cart = await Cart.findOne({ sessionId: req.sessionID });
            }

            if (!cart || !cart.items.length) {
                return res.json({ success: true, reply: 'Your cart is already empty.' });
            }

            cart.items = [];
            await cart.save();
            if (!req.session.userId) req.session.guest = true;
            
            return res.json({ success: true, reply: 'Your cart has been cleared. You can add new products anytime.' });
        }

        // Search and discovery
        if (/(show me|find|search|looking for|browse)/.test(lower)) {
            const query = { stock: { $gt: 0 } };
            const priceMatch = lower.match(/(?:under|below|less than)\s*₹?\s*(\d+)/) || lower.match(/(?:under|below|less than)\s*\$\s*(\d+)/);
            if (priceMatch) {
                query.price = { $lte: parseInt(priceMatch[1], 10) };
            }

            const category = normalizeCategory(lower);
            if (category) {
                query.category = category;
            }

            const keywordMatch = lower.match(/\b(shoes|shirt|kurta|dress|jeans|top|bottom|scarf|bag|jacket|trouser|sandal|pajama|accessories)\b/);
            if (keywordMatch) {
                const keyword = keywordMatch[1];
                query.$or = [
                    { name: new RegExp(keyword, 'i') },
                    { description: new RegExp(keyword, 'i') }
                ];
            }

            const products = await Product.find(query).limit(8);
            return res.json({
                success: true,
                reply: `Here are some products I found:\n${formatProductList(products)}`
            });
        }

        // FAQ automation
        if (/(shipping|delivery|ship)/.test(lower)) {
            return res.json({ success: true, reply: 'Shipping across Pakistan is free for orders over Rs. 3,000. Standard delivery takes 3-5 business days with tracking updates available after order confirmation.' });
        }

        if (/(return|refund|exchange)/.test(lower)) {
            return res.json({ success: true, reply: 'Returns are accepted within 7 days of delivery. Please keep the product unused and in original condition. Contact support for an easy return authorization.' });
        }

        if (/(payment|jazzcash|cod|whatsapp)/.test(lower)) {
            return res.json({ success: true, reply: 'We accept JazzCash, Cash on Delivery (COD), and WhatsApp payments. If you need help choosing a payment method, just ask.' });
        }

        if (/(also bought|recommend|trending|popular)/.test(lower)) {
            const trending = await Product.find({ stock: { $gt: 0 } }).sort({ createdAt: -1 }).limit(6);
            return res.json({ success: true, reply: `Customers also viewed these trending products:\n${formatProductList(trending)}` });
        }

        // Fallback search on product name/description
        const fallbackTerms = lower.match(/\b\w{3,}\b/g) || [];
        if (fallbackTerms.length) {
            const searchTerm = fallbackTerms.slice(0, 5).join(' ');
            const products = await Product.find({
                stock: { $gt: 0 },
                $or: [
                    { name: new RegExp(searchTerm, 'i') },
                    { description: new RegExp(searchTerm, 'i') }
                ]
            }).limit(6);

            return res.json({
                success: true,
                reply: `I found these products related to your request:\n${formatProductList(products)}`
            });
        }

        return res.json({
            success: true,
            reply: 'I am ready to help with search, cart actions, order tracking, coupons, and shipping questions. Try asking: "Show me shirts under 1500" or "Track my order 60d2f5...".'
        });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.json({ success: false, reply: 'Sorry, something went wrong while processing your request.' });
    }
};