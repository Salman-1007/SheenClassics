const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

exports.getCart = async(req, res) => {
    try {
        // Allow access to cart for both logged-in and anonymous users
        // Redirect to account page with cart tab for logged-in users
        if (req.session.userId) {
            return res.redirect('/account?tab=cart');
        }

        // For anonymous users, show cart page or redirect to home with cart modal
        return res.redirect('/?showCart=true');
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load cart'
        });
    }
};

exports.addToCart = async(req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        if (product.stock === 0) {
            return res.json({ success: false, message: 'Product is out of stock' });
        }

        const requestedQuantity = parseInt(quantity) || 1;

        if (requestedQuantity > product.stock) {
            return res.json({
                success: false,
                message: `Only ${product.stock} items available in stock`
            });
        }

        // Find cart by user or sessionId
        let cart;
        if (req.session.userId) {
            cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
        } else {
            cart = await Cart.findOne({ sessionId: req.session.id }).populate('items.product');
        }

        if (!cart) {
            cart = new Cart({
                user: req.session.userId || null,
                sessionId: req.session.userId ? null : req.session.id,
                items: []
            });
        } else {
            // Check total quantity including existing items
            const existingItem = cart.items.find(item =>
                item.product._id.toString() === productId &&
                item.size === size &&
                item.color === color
            );

            if (existingItem) {
                const newTotalQuantity = existingItem.quantity + requestedQuantity;
                if (newTotalQuantity > product.stock) {
                    return res.json({
                        success: false,
                        message: `Only ${product.stock} items available. You already have ${existingItem.quantity} in cart.`
                    });
                }
            }
        }

        const existingItem = cart.items.find(item =>
            item.product.toString() === productId &&
            item.size === size &&
            item.color === color
        );

        if (existingItem) {
            existingItem.quantity += requestedQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity: requestedQuantity,
                size,
                color
            });
        }

        await cart.save();
        res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.json({ success: false, message: 'Failed to add product to cart' });
    }
};

exports.updateCartItem = async(req, res) => {
    try {
        const { itemId, quantity } = req.body;

        // Find cart by user or sessionId
        let cart;
        if (req.session.userId) {
            cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
        } else {
            cart = await Cart.findOne({ sessionId: req.session.id }).populate('items.product');
        }

        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.id(itemId);
        if (item) {
            const requestedQuantity = parseInt(quantity);

            if (requestedQuantity < 1) {
                return res.json({ success: false, message: 'Quantity must be at least 1' });
            }

            // Check stock availability
            const product = await Product.findById(item.product._id || item.product);
            if (!product) {
                return res.json({ success: false, message: 'Product not found' });
            }

            if (requestedQuantity > product.stock) {
                return res.json({
                    success: false,
                    message: `Only ${product.stock} items available in stock`
                });
            }

            item.quantity = requestedQuantity;
            await cart.save();
            res.json({ success: true, message: 'Cart updated' });
        } else {
            res.json({ success: false, message: 'Item not found' });
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        res.json({ success: false, message: 'Failed to update cart' });
    }
};

exports.removeFromCart = async(req, res) => {
    try {
        const { itemId } = req.body;

        // Find cart by user or sessionId
        let cart;
        if (req.session.userId) {
            cart = await Cart.findOne({ user: req.session.userId });
        } else {
            cart = await Cart.findOne({ sessionId: req.session.id });
        }

        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.json({ success: false, message: 'Failed to remove item' });
    }
};