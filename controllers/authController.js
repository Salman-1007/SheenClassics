const User = require('../models/User');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const { validationResult } = require('express-validator');

exports.getLogin = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Login - SheenClassics',
        isAdmin: req.query.admin === 'true'
    });
};

exports.postLogin = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.render('auth/login', {
                title: 'Login - SheenClassics',
                error: 'Invalid email or password',
                email,
                isAdmin: req.query.admin === 'true'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth/login', {
                title: 'Login - SheenClassics',
                error: 'Invalid email or password',
                email,
                isAdmin: req.query.admin === 'true'
            });
        }

        req.session.userId = user._id;
        req.session.isAdmin = user.isAdmin;
        req.session.userName = user.name;

        // Merge anonymous cart and wishlist with user account
        try {
            // Merge cart
            const sessionCart = await Cart.findOne({ sessionId: req.session.id });
            const userCart = await Cart.findOne({ user: user._id });

            if (sessionCart) {
                if (userCart) {
                    // Merge items
                    sessionCart.items.forEach(sessionItem => {
                        const existingItem = userCart.items.find(item =>
                            item.product.toString() === sessionItem.product.toString() &&
                            item.size === sessionItem.size &&
                            item.color === sessionItem.color
                        );
                        if (existingItem) {
                            existingItem.quantity += sessionItem.quantity;
                        } else {
                            userCart.items.push(sessionItem);
                        }
                    });
                    await userCart.save();
                    await Cart.deleteOne({ sessionId: req.session.id });
                } else {
                    // Convert session cart to user cart
                    sessionCart.user = user._id;
                    sessionCart.sessionId = undefined;
                    await sessionCart.save();
                }
            }

            // Merge wishlist
            const sessionWishlist = await Wishlist.findOne({ sessionId: req.session.id });
            const userWishlist = await Wishlist.findOne({ user: user._id });

            if (sessionWishlist) {
                if (userWishlist) {
                    // Merge products
                    sessionWishlist.products.forEach(productId => {
                        if (!userWishlist.products.includes(productId)) {
                            userWishlist.products.push(productId);
                        }
                    });
                    await userWishlist.save();
                    await Wishlist.deleteOne({ sessionId: req.session.id });
                } else {
                    // Convert session wishlist to user wishlist
                    sessionWishlist.user = user._id;
                    sessionWishlist.sessionId = undefined;
                    await sessionWishlist.save();
                }
            }
        } catch (mergeError) {
            console.error('Error merging cart/wishlist:', mergeError);
            // Continue with login even if merge fails
        }

        if (user.isAdmin) {
            return res.redirect('/admin/dashboard');
        }

        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - SheenClassics',
            error: 'An error occurred. Please try again.',
            isAdmin: req.query.admin === 'true'
        });
    }
};

exports.getSignup = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('auth/signup', {
        title: 'Sign Up - SheenClassics',
        isAdmin: req.query.admin === 'true'
    });
};

exports.postSignup = async(req, res) => {
    try {
        const { name, email, password, confirmPassword, isAdmin } = req.body;

        if (password !== confirmPassword) {
            return res.render('auth/signup', {
                title: 'Sign Up - SheenClassics',
                error: 'Passwords do not match',
                name,
                email,
                isAdmin: req.query.admin === 'true'
            });
        }

        if (password.length < 6) {
            return res.render('auth/signup', {
                title: 'Sign Up - SheenClassics',
                error: 'Password must be at least 6 characters',
                name,
                email,
                isAdmin: req.query.admin === 'true'
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.render('auth/signup', {
                title: 'Sign Up - SheenClassics',
                error: 'Email already registered',
                name,
                email,
                isAdmin: req.query.admin === 'true'
            });
        }

        const user = new User({
            name,
            email: email.toLowerCase(),
            password,
            isAdmin: isAdmin === 'true' || isAdmin === true
        });

        await user.save();

        req.session.userId = user._id;
        req.session.isAdmin = user.isAdmin;
        req.session.userName = user.name;

        if (user.isAdmin) {
            return res.redirect('/admin/dashboard');
        }

        res.redirect('/');
    } catch (error) {
        console.error('Signup error:', error);
        res.render('auth/signup', {
            title: 'Sign Up - SheenClassics',
            error: 'An error occurred. Please try again.',
            isAdmin: req.query.admin === 'true'
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
};