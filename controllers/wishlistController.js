const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

exports.getWishlist = async(req, res) => {
    try {
        // Allow access to wishlist for both logged-in and anonymous users
        if (req.session.userId) {
            return res.redirect('/account?tab=wishlist');
        }

        // For anonymous users, show wishlist page or redirect to home with wishlist modal
        return res.redirect('/?showWishlist=true');
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load wishlist'
        });
    }
};

exports.addToWishlist = async(req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        // Find wishlist by user or sessionId
        let wishlist;
        if (req.session.userId) {
            wishlist = await Wishlist.findOne({ user: req.session.userId });
        } else {
            wishlist = await Wishlist.findOne({ sessionId: req.sessionID });
        }

        if (!wishlist) {
            wishlist = new Wishlist({
                user: req.session.userId || null,
                sessionId: req.session.userId ? null : req.sessionID,
                products: []
            });
        }

        const alreadyAdded = wishlist.products.some(id => id.toString() === productId);
        if (alreadyAdded) {
            return res.json({ success: false, message: 'Product already in wishlist' });
        }

        wishlist.products.push(productId);
        await wishlist.save();

        // Ensure session is saved for guests
        if (!req.session.userId) {
            req.session.guest = true;
        }

        res.json({ success: true, message: 'Product added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.json({ success: false, message: 'Failed to add product to wishlist' });
    }
};

exports.removeFromWishlist = async(req, res) => {
    try {
        const productId = req.body.productId || req.query.productId;

        // Find wishlist by user or sessionId
        let wishlist;
        if (req.session.userId) {
            wishlist = await Wishlist.findOne({ user: req.session.userId });
        } else {
            wishlist = await Wishlist.findOne({ sessionId: req.sessionID });
        }

        if (!wishlist) {
            return res.json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.products = wishlist.products.filter(
            id => id.toString() !== productId
        );
        await wishlist.save();

        // Ensure session is saved for guests
        if (!req.session.userId) {
            req.session.guest = true;
        }

        res.json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.json({ success: false, message: 'Failed to remove product from wishlist' });
    }
};