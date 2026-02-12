const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const User = require('../models/User');

exports.getDashboard = async(req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalRevenue = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const recentOrders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard - SheenClassics',
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue: totalRevenue[0] ? .total || 0,
            recentOrders
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load dashboard'
        });
    }
};

exports.getProducts = async(req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.render('admin/products', {
            title: 'Manage Products - SheenClassics',
            products,
            query: req.query
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load products'
        });
    }
};

exports.getAddProduct = (req, res) => {
    res.render('admin/add-product', {
        title: 'Add Product - SheenClassics',
        query: req.query
    });
};

exports.postAddProduct = async(req, res) => {
    try {
        const { name, description, price, originalPrice, category, sizes, colors, stock, featured } = req.body;
        let images = [];
        if (req.file) {
            images.push('/uploads/' + req.file.filename);
        }
        const product = new Product({
            name,
            description,
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            category,
            sizes: sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [],
            colors: colors ? (Array.isArray(colors) ? colors : [colors]) : [],
            stock: parseInt(stock),
            featured: featured === 'on',
            images
        });
        await product.save();
        res.redirect('/admin/products?success=Product added successfully');
    } catch (error) {
        console.error('Error adding product:', error);
        res.redirect('/admin/products/add?error=Failed to add product');
    }
};

exports.getEditProduct = async(req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('404', { title: 'Product Not Found - SheenClassics' });
        }

        res.render('admin/edit-product', {
            title: 'Edit Product - SheenClassics',
            product,
            query: req.query
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load product'
        });
    }
};

exports.postEditProduct = async(req, res) => {
    try {
        const { name, description, price, originalPrice, category, sizes, colors, stock, featured } = req.body;

        await Product.findByIdAndUpdate(req.params.id, {
            name,
            description,
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            category,
            sizes: sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [],
            colors: colors ? (Array.isArray(colors) ? colors : [colors]) : [],
            stock: parseInt(stock),
            featured: featured === 'on'
        });

        res.redirect('/admin/products?success=Product updated successfully');
    } catch (error) {
        console.error('Error updating product:', error);
        res.redirect(`/admin/products/${req.params.id}/edit?error=Failed to update product`);
    }
};

exports.deleteProduct = async(req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.json({ success: false, message: 'Failed to delete product' });
    }
};

exports.getOrders = async(req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email')
            .populate('items.product')
            .sort({ createdAt: -1 });

        res.render('admin/orders', {
            title: 'Manage Orders - SheenClassics',
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load orders'
        });
    }
};

exports.updateOrderStatus = async(req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.json({ success: false, message: 'Failed to update order status' });
    }
};

exports.getCoupons = async(req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('admin/coupons', {
            title: 'Manage Coupons - SheenClassics',
            coupons,
            query: req.query
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load coupons'
        });
    }
};

exports.postAddCoupon = async(req, res) => {
    try {
        const { code, discountType, discountValue, minPurchase, maxDiscount, validFrom, validUntil, usageLimit } = req.body;

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            minPurchase: parseFloat(minPurchase) || 0,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            usageLimit: usageLimit ? parseInt(usageLimit) : null
        });

        await coupon.save();
        res.redirect('/admin/coupons?success=Coupon added successfully');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.redirect('/admin/coupons?error=Failed to add coupon');
    }
};

exports.getUsers = async(req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).sort({ createdAt: -1 });
        const totalUsers = users.length;
        const activeUsers = await Order.distinct('user', { status: { $ne: 'cancelled' } });
        const activeUserCount = activeUsers.length;

        res.render('admin/users', {
            title: 'Manage Users - SheenClassics',
            users,
            totalUsers,
            activeUsers: activeUserCount,
            query: req.query
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load users'
        });
    }
};