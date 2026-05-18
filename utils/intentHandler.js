/**
 * Intent Handler - Rule-based intents for hardcoded responses
 * Handles common FAQs and predefined user intents
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');

/**
 * Extracts 24-character ObjectId from text
 */
const extractObjectId = (text) => {
    const match = text.match(/([0-9a-fA-F]{24})/);
    return match ? match[1] : null;
};

/**
 * Normalizes category names consistently
 */
const normalizeCategory = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('cloth')) return 'Clothing';
    if (lower.includes('home') || lower.includes('decor')) return 'HomeDecor';
    return null;
};

/**
 * Format products for display
 */
const formatProductList = (products) => {
    if (!products.length) {
        return 'No matching products found right now.';
    }

    return products
        .slice(0, 5) // Limit to 5 products
        .map(product => {
            const availability = product.stock > 0 ? '✓ In stock' : '✗ Out of stock';
            const productLink = `http://localhost:3000/products/${product.slug || product._id}`;
            return `• [${product.name}](${productLink}) - Rs.${product.price} ${availability}`;
        })
        .join('\n');
};

/**
 * Main intent detection function
 * Returns { matched: boolean, response: string, intent: string }
 */
async function detectIntent(message, userId) {
    const lower = message.toLowerCase().trim();

    // 1. DELIVERY & SHIPPING QUERIES
    if (/delivery|shipping|how long|when.*arrive|track|package/.test(lower)) {
        if (/(free|cost).*delivery|delivery.*free/.test(lower)) {
            return {
                matched: true,
                intent: 'delivery_cost',
                response: '✓ **Free Delivery**: We offer FREE nationwide delivery on orders above Rs 3,000. Orders below this amount have a delivery charge of Rs 200. Delivery typically takes 3-5 business days.'
            };
        }

        // Order tracking
        const orderId = extractObjectId(lower);
        let order;

        if (orderId) {
            order = await Order.findById(orderId).populate('items.product');
        } else if (userId) {
            order = await Order.findOne({ user: userId }).sort({ createdAt: -1 }).populate('items.product');
        }

        if (!order) {
            return {
                matched: true,
                intent: 'order_tracking_not_found',
                response: '📦 I couldn\'t find your order. Please provide an order ID, or sign in so I can locate your latest order.'
            };
        }

        const timeline = order.statusHistory && order.statusHistory.length ?
            order.statusHistory
            .map(entry => `• **${entry.status}** on ${entry.timestamp.toDateString()}`)
            .join('\n') :
            `**Status**: ${order.status}`;

        return {
            matched: true,
            intent: 'order_tracking_found',
            response: `📦 **Order #${order._id}**\n${timeline}\n\n💬 Need more details? Reply with your order number.`
        };
    }

    // 2. REFUND & RETURNS
    if (/refund|return|exchange|cancel.*order/.test(lower)) {
        return {
            matched: true,
            intent: 'refund_returns',
            response: '↩️ **Returns & Refunds**: We accept returns within 30 days of purchase if items are unused and in original packaging.\n\n📋 **Process**:\n1. Contact us with photos of the product\n2. We arrange pickup\n3. Once verified, we process your refund within 5-7 days\n\nNeed help? Reply with your order number.'
        };
    }

    // 3. COUPON & DISCOUNT
    if (/(apply|use|redeem).*coupon|coupon code|discount code|promo/.test(lower)) {
        const couponMatch = lower.match(/(?:coupon|code|promo)[:\s]*([a-z0-9-]+)/i);

        if (!couponMatch) {
            return {
                matched: true,
                intent: 'coupon_ask_code',
                response: '🎁 **Apply Coupon**: Please provide the coupon code. For example: "Apply coupon SAVE10"'
            };
        }

        const code = couponMatch[1].toUpperCase();
        try {
            const coupon = await Coupon.findOne({ code });

            if (!coupon) {
                return {
                    matched: true,
                    intent: 'coupon_invalid',
                    response: `❌ Coupon **${code}** not found. Check the code and try again.`
                };
            }

            if (!coupon.isValid ?.()) {
                return {
                    matched: true,
                    intent: 'coupon_expired',
                    response: `⏰ Coupon **${code}** has expired.`
                };
            }

            const discountText = coupon.discountType === 'percentage' ?
                `${coupon.discountValue}% off` :
                `Rs.${coupon.discountValue} off`;

            return {
                matched: true,
                intent: 'coupon_valid',
                response: `✅ Coupon **${code}** is valid!\n🏷️ ${discountText} on orders above Rs.${coupon.minPurchase}`
            };
        } catch (error) {
            console.error('Coupon lookup error:', error);
            return {
                matched: true,
                intent: 'coupon_error',
                response: '⚠️ Error checking coupon. Please try again.'
            };
        }
    }

    // 4. PRODUCT SEARCH
    if (/search|find|look for|show me|what.*have|browse|collection/.test(lower)) {
        try {
            let query = {};
            let searchText = lower.replace(/search|find|look for|show me|what.*have|browse|collection/g, '').trim();

            // Extract category if mentioned
            const category = normalizeCategory(searchText);
            if (category) {
                query.category = category;
                searchText = searchText.replace(/cloth|home|decor/g, '').trim();
            }

            // Search by name or description
            if (searchText.length > 2) {
                query.$or = [
                    { name: { $regex: searchText, $options: 'i' } },
                    { description: { $regex: searchText, $options: 'i' } }
                ];
            }

            const products = await Product.find(query).limit(5);

            if (!products.length) {
                return {
                    matched: true,
                    intent: 'search_no_results',
                    response: `🔍 No products found for "${searchText}". Try browsing our [**full collection**](http://localhost:3000/products).`
                };
            }

            return {
                matched: true,
                intent: 'search_results',
                response: `🛍️ **Products Found**:\n${formatProductList(products)}`
            };
        } catch (error) {
            console.error('Product search error:', error);
            return {
                matched: true,
                intent: 'search_error',
                response: '⚠️ Search error. Please try again.'
            };
        }
    }

    // 5. FAQ - GENERAL
    if (/hello|hi|help|what.*do|who.*are|about|contact/.test(lower)) {
        return {
            matched: true,
            intent: 'greeting_help',
            response: `👋 **Hello! I'm SheenClassics Assistant**\n\n**How I can help**:\n✓ Track orders\n✓ Apply coupons\n✓ Search products\n✓ Help with returns\n✓ Answer shipping questions\n\nWhat would you like to know?`
        };
    }

    // 6. COMPANY INFO
    if (/sheenclassics|company|about us|who.*behind|contact|email|phone/.test(lower)) {
        return {
            matched: true,
            intent: 'company_info',
            response: `🏢 **SheenClassics**\n\n📧 Email: Sheenclassics@gmail.com\n📱 WhatsApp: +92 320 889 2458\n\n✨ Premium embroidered clothing for the modern classic.\n\n🌐 Browse: [http://localhost:3000](http://localhost:3000)`
        };
    }

    // 7. PAYMENT & CHECKOUT
    if (/payment|pay|checkout|card|method|price/.test(lower)) {
        return {
            matched: true,
            intent: 'payment_info',
            response: `💳 **Payment Methods**:\n\n1. **Credit/Debit Card** - Secure payment processing\n2. **Bank Transfer** - Direct deposit\n3. **Cash on Delivery** - Available in select areas\n\n🔒 All payments are encrypted and secure.`
        };
    }

    // No intent matched
    return {
        matched: false,
        intent: null,
        response: null
    };
}

module.exports = {
    detectIntent,
    extractObjectId,
    normalizeCategory,
    formatProductList
};