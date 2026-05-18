/**
 * Tool Service - safe ecommerce actions the AI assistant can call.
 */

const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const mongoose = require('mongoose');

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const DEFAULT_DELIVERY_CHARGE = 250;

const TOOLS = [
    {
        name: 'searchProducts',
        description: 'Search products by keyword, category, and optional price range. Always return clickable product links.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search words. Use an empty string for broad searches.' },
                category: { type: 'string', description: 'Optional category: Clothing or HomeDecor. Omit or use empty string when unknown.' },
                minPrice: { type: 'number', description: 'Optional minimum product price in PKR.' },
                maxPrice: { type: 'number', description: 'Optional maximum product price in PKR.' },
                limit: { type: 'integer', description: 'Maximum results, default 5, max 10.' }
            },
            required: []
        }
    },
    {
        name: 'getProductDetails',
        description: 'Get detailed information for a product by ID, slug, or name. Always return a clickable product link.',
        parameters: {
            type: 'object',
            properties: {
                productId: { type: 'string', description: 'Product ID, slug, or name.' }
            },
            required: ['productId']
        }
    },
    {
        name: 'getCart',
        description: 'Display the current cart with clickable product links, quantities, subtotal, delivery, and total.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' }
            },
            required: []
        }
    },
    {
        name: 'addToCart',
        description: 'Add a product to the current cart by ID, slug, or name.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' },
                productId: { type: 'string', description: 'Product ID, slug, or exact/partial product name.' },
                quantity: { type: 'integer', description: 'Quantity, default 1.' },
                size: { type: 'string', description: 'Size if applicable.' },
                color: { type: 'string', description: 'Color if applicable.' }
            },
            required: ['productId']
        }
    },
    {
        name: 'removeFromCart',
        description: 'Remove a product from the cart by cart item ID, product ID, slug, or name.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' },
                productId: { type: 'string', description: 'Cart item ID, product ID, slug, or product name.' }
            },
            required: ['productId']
        }
    },
    {
        name: 'emptyCart',
        description: 'Remove all items from the current cart.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' }
            },
            required: []
        }
    },
    {
        name: 'applyCoupon',
        description: 'Validate a coupon against the current cart and return the updated total.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' },
                couponCode: { type: 'string', description: 'Coupon code.' }
            },
            required: ['couponCode']
        }
    },
    {
        name: 'placeOrder',
        description: 'Place an order from the current cart. Requires WhatsApp number and shipping address. Guests also require name, email, and phone.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                sessionId: { type: 'string', description: 'Current session ID for guest carts.' },
                whatsappNumber: { type: 'string', description: 'WhatsApp number in 03XXXXXXXXX or +923XXXXXXXXXX format.' },
                street: { type: 'string', description: 'Shipping street address.' },
                city: { type: 'string', description: 'Shipping city.' },
                state: { type: 'string', description: 'Shipping state or province.' },
                zipCode: { type: 'string', description: 'Shipping postal code.' },
                country: { type: 'string', description: 'Shipping country.' },
                guestName: { type: 'string', description: 'Guest name if not signed in.' },
                guestEmail: { type: 'string', description: 'Guest email if not signed in.' },
                guestPhone: { type: 'string', description: 'Guest phone if not signed in.' },
                couponCode: { type: 'string', description: 'Optional coupon code.' }
            },
            required: ['whatsappNumber', 'street', 'city']
        }
    },
    {
        name: 'cancelOrder',
        description: 'Cancel a pending or processing order and restore stock.',
        parameters: {
            type: 'object',
            properties: {
                orderId: { type: 'string', description: 'Order ID.' },
                userId: { type: 'string', description: 'Current user ID.' },
                allowedOrderId: { type: 'string', description: 'Allowed guest order ID from session.' },
                isAdmin: { type: 'boolean', description: 'Whether current user is admin.' }
            },
            required: ['orderId']
        }
    },
    {
        name: 'getOrderStatus',
        description: 'Get status and items for a specific order.',
        parameters: {
            type: 'object',
            properties: {
                orderId: { type: 'string', description: 'Order ID.' },
                userId: { type: 'string', description: 'Current user ID.' },
                allowedOrderId: { type: 'string', description: 'Allowed guest order ID from session.' },
                isAdmin: { type: 'boolean', description: 'Whether current user is admin.' }
            },
            required: ['orderId']
        }
    },
    {
        name: 'listOrders',
        description: 'List recent orders for the signed-in user with clickable order links.',
        parameters: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: 'Current user ID.' },
                limit: { type: 'integer', description: 'Maximum recent orders, default 5.' }
            },
            required: []
        }
    }
];

function isObjectId(value) {
    return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

function productLink(product) {
    return `${SITE_URL}/products/${product.slug || product._id}`;
}

function orderLink(order) {
    return `${SITE_URL}/orders/${order._id || order}`;
}

function asMarkdownLink(label, url) {
    return `[${label}](${url})`;
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchQuery(query) {
    return String(query || '')
        .replace(/\b(products?|items?|pieces?|show|find|me|under|below|less than|over|above|more than|rs|pkr)\b/gi, ' ')
        .replace(/\d+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function inferPriceRange(params) {
    const query = String(params.query || '').toLowerCase();
    const inferred = {};
    const under = query.match(/\b(?:under|below|less than)\s*(?:rs\.?|pkr)?\s*(\d+)/i);
    const over = query.match(/\b(?:over|above|more than)\s*(?:rs\.?|pkr)?\s*(\d+)/i);

    if (under && params.maxPrice === undefined) inferred.maxPrice = Number(under[1]);
    if (over && params.minPrice === undefined) inferred.minPrice = Number(over[1]);

    return {
        minPrice: params.minPrice ?? inferred.minPrice,
        maxPrice: params.maxPrice ?? inferred.maxPrice
    };
}

async function findProduct(identifier) {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

    if (isObjectId(raw)) {
        const byId = await Product.findById(raw);
        if (byId) return byId;
    }

    const slug = raw.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const bySlug = await Product.findOne({ slug });
    if (bySlug) return bySlug;

    return Product.findOne({
        $or: [
            { name: { $regex: `^${escapeRegex(raw)}$`, $options: 'i' } },
            { name: { $regex: escapeRegex(raw), $options: 'i' } }
        ]
    });
}

async function findCart(params = {}, options = {}) {
    const userId = params.userId;
    const sessionId = params.sessionId;
    const query = isObjectId(userId) ? { user: userId } : sessionId ? { sessionId } : null;

    if (!query) return null;

    let cart = await Cart.findOne(query).populate('items.product');
    if (!cart && options.create) {
        cart = new Cart({
            user: isObjectId(userId) ? userId : null,
            sessionId: isObjectId(userId) ? null : sessionId,
            items: []
        });
    }

    return cart;
}

function summarizeCart(cart) {
    const validItems = (cart?.items || []).filter(item => item.product);
    const subtotal = validItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const deliveryCharge = validItems.reduce((sum, item) => {
        const fee = typeof item.product.shippingFee === 'number' ? item.product.shippingFee : DEFAULT_DELIVERY_CHARGE;
        return sum + fee * item.quantity;
    }, 0);
    const total = subtotal + deliveryCharge;

    return {
        itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        deliveryCharge,
        total,
        items: validItems.map(item => ({
            cartItemId: item._id,
            productId: item.product._id,
            name: item.product.name,
            productLink: productLink(item.product),
            markdownLink: asMarkdownLink(item.product.name, productLink(item.product)),
            price: item.product.price,
            quantity: item.quantity,
            size: item.size || '',
            color: item.color || '',
            subtotal: item.product.price * item.quantity
        }))
    };
}

async function searchProducts(params = {}) {
    try {
        const { category, limit = 5 } = params;
        const { minPrice, maxPrice } = inferPriceRange(params);
        const queryText = normalizeSearchQuery(params.query);
        const mongoQuery = {};

        if (category && ['Clothing', 'HomeDecor'].includes(category)) {
            mongoQuery.category = category;
        }

        if (queryText && !['clothing', 'clothes', 'home', 'decor', 'homedecor'].includes(queryText.toLowerCase())) {
            mongoQuery.$or = [
                { name: { $regex: escapeRegex(queryText), $options: 'i' } },
                { description: { $regex: escapeRegex(queryText), $options: 'i' } }
            ];
        }

        const priceQuery = {};
        if (minPrice !== undefined && minPrice !== null && minPrice !== '') priceQuery.$gte = Number(minPrice);
        if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') priceQuery.$lte = Number(maxPrice);
        if (Object.keys(priceQuery).length) mongoQuery.price = priceQuery;

        const products = await Product.find(mongoQuery)
            .select('_id name slug price originalPrice category stock images sizes colors')
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit) || 5, 10));

        return {
            success: true,
            count: products.length,
            products: products.map(product => ({
                id: product._id,
                name: product.name,
                markdownLink: asMarkdownLink(product.name, productLink(product)),
                link: productLink(product),
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                inStock: product.stock > 0,
                stock: product.stock,
                sizes: product.sizes || [],
                colors: product.colors || []
            }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getProductDetails(params = {}) {
    try {
        const product = await findProduct(params.productId);
        if (!product) return { success: false, error: 'Product not found' };

        return {
            success: true,
            product: {
                id: product._id,
                name: product.name,
                markdownLink: asMarkdownLink(product.name, productLink(product)),
                link: productLink(product),
                description: product.description,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                stock: product.stock,
                inStock: product.stock > 0,
                sizes: product.sizes || [],
                colors: product.colors || [],
                images: product.images || []
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCart(params = {}) {
    try {
        const cart = await findCart(params);
        if (!cart || !cart.items.length) {
            return { success: true, itemCount: 0, items: [], subtotal: 0, deliveryCharge: 0, total: 0 };
        }

        return { success: true, ...summarizeCart(cart) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function addToCart(params = {}) {
    try {
        const quantity = Math.max(parseInt(params.quantity, 10) || 1, 1);
        const size = params.size || '';
        const color = params.color || '';
        const product = await findProduct(params.productId);

        if (!product) return { success: false, error: 'Product not found' };
        if (product.stock <= 0) return { success: false, error: `"${product.name}" is out of stock`, productLink: productLink(product) };
        if (quantity > product.stock) return { success: false, error: `Only ${product.stock} items are available for "${product.name}".` };

        const cart = await findCart(params, { create: true });
        if (!cart) return { success: false, error: 'Could not identify a cart. Please sign in or refresh the page.' };

        const existingItem = cart.items.find(item =>
            item.product &&
            item.product._id.toString() === product._id.toString() &&
            item.size === size &&
            item.color === color
        );

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return { success: false, error: `Only ${product.stock} items are available. You already have ${existingItem.quantity} in cart.` };
            }
            existingItem.quantity = newQuantity;
        } else {
            cart.items.push({ product: product._id, quantity, size, color });
        }

        await cart.save();
        await cart.populate('items.product');

        return {
            success: true,
            message: `Added ${quantity} x ${asMarkdownLink(product.name, productLink(product))} to cart.`,
            product: {
                id: product._id,
                name: product.name,
                markdownLink: asMarkdownLink(product.name, productLink(product)),
                link: productLink(product)
            },
            cart: summarizeCart(cart)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function removeFromCart(params = {}) {
    try {
        const cart = await findCart(params);
        if (!cart || !cart.items.length) return { success: false, error: 'Cart is already empty.' };

        const identifier = String(params.productId || '').trim();
        const product = await findProduct(identifier);
        const before = cart.items.length;

        cart.items = cart.items.filter(item => {
            const cartItemMatches = item._id.toString() === identifier;
            const productMatches = product && item.product && item.product._id.toString() === product._id.toString();
            return !(cartItemMatches || productMatches);
        });

        if (cart.items.length === before) return { success: false, error: 'I could not find that item in your cart.' };

        await cart.save();
        await cart.populate('items.product');

        return { success: true, message: 'Item removed from cart.', cart: summarizeCart(cart) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function emptyCart(params = {}) {
    try {
        const cart = await findCart(params);
        if (!cart || !cart.items.length) return { success: true, message: 'Cart is already empty.', itemCount: 0 };

        cart.items = [];
        await cart.save();

        return { success: true, message: 'Cart emptied successfully.', itemCount: 0 };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function applyCoupon(params = {}) {
    try {
        const couponCode = String(params.couponCode || '').trim().toUpperCase();
        if (!couponCode) return { success: false, error: 'Coupon code is required.' };

        const cart = await findCart(params);
        if (!cart || !cart.items.length) return { success: false, error: 'Cart is empty.' };

        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) return { success: false, error: `Coupon "${couponCode}" not found.` };
        if (!coupon.isValid?.()) return { success: false, error: `Coupon "${couponCode}" is expired or inactive.` };

        const summary = summarizeCart(cart);
        if (summary.subtotal < coupon.minPurchase) {
            return { success: false, error: `Minimum purchase of Rs ${coupon.minPurchase} required.` };
        }

        const discount = coupon.calculateDiscount ? coupon.calculateDiscount(summary.subtotal) :
            coupon.discountType === 'percentage' ? (summary.subtotal * coupon.discountValue) / 100 : coupon.discountValue;

        return {
            success: true,
            message: `Coupon "${couponCode}" is valid.`,
            couponCode,
            discount,
            subtotal: summary.subtotal,
            deliveryCharge: summary.deliveryCharge,
            total: summary.subtotal - discount + summary.deliveryCharge
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function placeOrder(params = {}) {
    try {
        const cart = await findCart(params);
        if (!cart || !cart.items.length) return { success: false, error: 'Cart is empty.' };

        const isGuest = !isObjectId(params.userId);
        const cleanWhatsappNumber = String(params.whatsappNumber || '').trim();
        const whatsappPattern = /^(03\d{9}|\+92\d{10})$/;

        if (!whatsappPattern.test(cleanWhatsappNumber)) {
            return { success: false, error: 'Please provide a valid WhatsApp number in 03XXXXXXXXX or +923XXXXXXXXXX format.' };
        }

        if (!params.street || !params.city) {
            return { success: false, error: 'Shipping street address and city are required.' };
        }

        let user = null;
        if (!isGuest) user = await User.findById(params.userId);

        if (isGuest && (!params.guestName || !params.guestEmail || !params.guestPhone)) {
            return { success: false, error: 'Guest checkout needs your name, email, and phone number.' };
        }

        const validItems = cart.items.filter(item => item.product);
        if (!validItems.length) return { success: false, error: 'Cart has no available products.' };

        for (const item of validItems) {
            const product = await Product.findById(item.product._id);
            if (!product) return { success: false, error: `Product "${item.product.name}" is no longer available.` };
            if (item.quantity > product.stock) {
                return { success: false, error: `Only ${product.stock} items are available for "${product.name}".` };
            }
        }

        const summary = summarizeCart(cart);
        let discount = 0;
        let couponCode = String(params.couponCode || '').trim().toUpperCase();

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon && coupon.isValid?.() && summary.subtotal >= coupon.minPurchase) {
                discount = coupon.calculateDiscount ? coupon.calculateDiscount(summary.subtotal) :
                    coupon.discountType === 'percentage' ? (summary.subtotal * coupon.discountValue) / 100 : coupon.discountValue;
                coupon.usedCount += 1;
                await coupon.save();
            } else {
                couponCode = '';
            }
        }

        const order = new Order({
            user: isGuest ? null : params.userId,
            guestInfo: isGuest ? {
                name: params.guestName,
                email: params.guestEmail,
                phone: params.guestPhone
            } : null,
            items: validItems.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                size: item.size,
                color: item.color
            })),
            subtotal: summary.subtotal,
            discount,
            deliveryCharge: summary.deliveryCharge,
            couponCode: couponCode || null,
            total: summary.subtotal - discount + summary.deliveryCharge,
            shippingAddress: {
                street: params.street,
                city: params.city,
                state: params.state || user?.address?.state || '',
                zipCode: params.zipCode || user?.address?.zipCode || '',
                country: params.country || user?.address?.country || 'Pakistan'
            },
            paymentMethod: 'whatsapp',
            paymentDetails: {
                whatsappNumber: cleanWhatsappNumber
            },
            statusHistory: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Order created by chatbot'
            }]
        });

        await order.save();

        for (const item of validItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.stock -= item.quantity;
                await product.save();
            }
        }

        cart.items = [];
        await cart.save();

        return {
            success: true,
            message: `Order placed successfully: ${asMarkdownLink(`#${order._id.toString().slice(-8).toUpperCase()}`, orderLink(order))}.`,
            orderId: order._id.toString(),
            orderLink: orderLink(order),
            total: order.total,
            status: order.status
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function canAccessOrder(order, params = {}) {
    if (params.isAdmin) return true;
    if (params.allowedOrderId && order._id.toString() === params.allowedOrderId) return true;
    return Boolean(params.userId && order.user && order.user.toString() === params.userId);
}

async function cancelOrder(params = {}) {
    try {
        if (!isObjectId(params.orderId)) return { success: false, error: 'Invalid order ID.' };

        const order = await Order.findById(params.orderId).populate('items.product');
        if (!order) return { success: false, error: 'Order not found.' };
        if (!canAccessOrder(order, params)) return { success: false, error: 'Unauthorized.' };
        if (!['pending', 'processing'].includes(order.status)) {
            return { success: false, error: `Cannot cancel an order with status "${order.status}".` };
        }

        for (const item of order.items) {
            const product = await Product.findById(item.product?._id || item.product);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        order.status = 'cancelled';
        order.statusHistory.push({
            status: 'cancelled',
            timestamp: new Date(),
            note: 'Order cancelled by chatbot'
        });
        await order.save({ validateBeforeSave: false });

        return {
            success: true,
            message: `Order ${asMarkdownLink(`#${order._id.toString().slice(-8).toUpperCase()}`, orderLink(order))} cancelled successfully.`,
            orderId: order._id,
            orderLink: orderLink(order),
            status: order.status
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getOrderStatus(params = {}) {
    try {
        if (!isObjectId(params.orderId)) return { success: false, error: 'Invalid order ID.' };

        const order = await Order.findById(params.orderId).populate('items.product');
        if (!order) return { success: false, error: 'Order not found.' };
        if (!canAccessOrder(order, params)) return { success: false, error: 'Unauthorized.' };

        return {
            success: true,
            order: {
                id: order._id,
                markdownLink: asMarkdownLink(`#${order._id.toString().slice(-8).toUpperCase()}`, orderLink(order)),
                link: orderLink(order),
                status: order.status,
                createdAt: order.createdAt,
                itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
                total: order.total,
                items: order.items.map(item => ({
                    name: item.product?.name || 'Product',
                    markdownLink: item.product ? asMarkdownLink(item.product.name, productLink(item.product)) : 'Product unavailable',
                    quantity: item.quantity,
                    price: item.price
                })),
                timeline: order.statusHistory?.map(entry => ({
                    status: entry.status,
                    timestamp: entry.timestamp,
                    note: entry.note
                })) || []
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function listOrders(params = {}) {
    try {
        if (!isObjectId(params.userId)) {
            return { success: false, error: 'Please sign in to view your order history.' };
        }

        const orders = await Order.find({ user: params.userId })
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(params.limit) || 5, 10))
            .populate('items.product');

        return {
            success: true,
            count: orders.length,
            orders: orders.map(order => ({
                id: order._id,
                markdownLink: asMarkdownLink(`#${order._id.toString().slice(-8).toUpperCase()}`, orderLink(order)),
                link: orderLink(order),
                status: order.status,
                total: order.total,
                createdAt: order.createdAt,
                itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0)
            }))
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function executeTool(toolName, params) {
    console.log(`[TOOL] Executing: ${toolName}`, params);

    switch (toolName) {
        case 'searchProducts':
            return searchProducts(params);
        case 'getProductDetails':
            return getProductDetails(params);
        case 'getCart':
            return getCart(params);
        case 'addToCart':
            return addToCart(params);
        case 'removeFromCart':
            return removeFromCart(params);
        case 'emptyCart':
            return emptyCart(params);
        case 'applyCoupon':
            return applyCoupon(params);
        case 'placeOrder':
            return placeOrder(params);
        case 'cancelOrder':
            return cancelOrder(params);
        case 'getOrderStatus':
            return getOrderStatus(params);
        case 'listOrders':
            return listOrders(params);
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

function validateToolCall(toolName, params) {
    const tool = TOOLS.find(t => t.name === toolName);
    if (!tool) return { valid: false, error: `Unknown tool: ${toolName}` };

    const required = tool.parameters.required || [];
    for (const param of required) {
        if (!(param in params) || params[param] === undefined || params[param] === '') {
            return { valid: false, error: `Missing required parameter: ${param}` };
        }
    }

    return { valid: true };
}

module.exports = {
    TOOLS,
    executeTool,
    validateToolCall,
    searchProducts,
    getProductDetails,
    getCart,
    addToCart,
    removeFromCart,
    emptyCart,
    applyCoupon,
    placeOrder,
    cancelOrder,
    getOrderStatus,
    listOrders
};
