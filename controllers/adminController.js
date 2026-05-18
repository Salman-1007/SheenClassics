const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Blog = require('../models/Blog');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const groqService = require('../services/groqService');

const LOW_STOCK_THRESHOLD = 5;
const CONTENT_TYPES = ['product-description', 'category-intro', 'blog-post', 'homepage-hero', 'about-snippet'];

// Helper: upload a buffer to Cloudinary and return the result
function uploadBufferToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

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
            totalRevenue: totalRevenue[0] ?.total || 0,
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
        const {
            name,
            description,
            price,
            originalPrice,
            category,
            sizes,
            colors,
            stock,
            featured,
            shippingFee,
            metaTitle,
            metaDescription,
            metaKeywords,
            seoTitle,
            seoDescription,
            seoKeywords,
            canonicalUrl,
            ogTitle,
            ogDescription,
            ogImage
        } = req.body;

        // Validate required fields
        if (!name || !description || !price || !category || stock === undefined || stock === '') {
            return res.status(400).render('admin/add-product', {
                title: 'Add Product - SheenClassics',
                error: 'All required fields must be filled: name, description, price, category, and stock'
            });
        }

        // Normalize uploaded files (support multer.array and multer.fields)
        let filesArray = [];
        if (Array.isArray(req.files)) {
            filesArray = req.files;
        } else if (req.files && typeof req.files === 'object') {
            // req.files may be an object like { images: [...], image: [...] }
            for (const key of Object.keys(req.files)) {
                if (Array.isArray(req.files[key])) filesArray.push(...req.files[key]);
            }
        }

        // Check if images were uploaded (support multiple images)
        if (!filesArray || filesArray.length === 0) {
            return res.status(400).render('admin/add-product', {
                title: 'Add Product - SheenClassics',
                error: 'At least one product image is required'
            });
        }

        // Upload each buffer to Cloudinary using helper
        try {
            const images = [];
            for (const file of filesArray) {
                try {
                    const result = await uploadBufferToCloudinary(file.buffer, {
                        folder: 'sheenclassics/products',
                        resource_type: 'auto',
                        quality: 'auto'
                    });
                    if (result && result.secure_url) images.push(result.secure_url);
                } catch (singleErr) {
                    console.error('Cloudinary single file upload error:', singleErr);
                    throw new Error('Failed to upload one of the product images.');
                }
            }

            if (images.length === 0) {
                throw new Error('No images were uploaded to Cloudinary');
            }

            // Create product with Cloudinary image URLs
            const product = new Product({
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                category,
                sizes: sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [],
                colors: colors ? colors.split(',').map(c => c.trim()).filter(c => c) : [],
                stock: parseInt(stock),
                featured: featured === 'on',
                images,
                shippingFee: shippingFee ? parseFloat(shippingFee) : 250,
                seoTitle: seoTitle || metaTitle || '',
                seoDescription: seoDescription || metaDescription || '',
                seoKeywords: seoKeywords || metaKeywords || '',
                metaTitle: metaTitle || seoTitle || undefined,
                metaDescription: metaDescription || seoDescription || undefined,
                metaKeywords: metaKeywords || seoKeywords || undefined,
                canonicalUrl: canonicalUrl || undefined,
                ogTitle: ogTitle || undefined,
                ogDescription: ogDescription || undefined,
                ogImage: ogImage || undefined
            });

            await product.save();
            res.redirect('/admin/products?success=Product added successfully');
        } catch (uploadError) {
            console.error('Cloudinary upload error:', uploadError.message || uploadError);
            let errorMsg = (uploadError && uploadError.message) ? uploadError.message : 'Failed to upload images to Cloudinary';

            res.status(500).render('admin/add-product', {
                title: 'Add Product - SheenClassics',
                error: errorMsg
            });
        }
    } catch (error) {
        console.error('Error adding product:', error.message);
        let errorMsg = error.message || 'Failed to add product';

        res.status(500).render('admin/add-product', {
            title: 'Add Product - SheenClassics',
            error: errorMsg
        });
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
        const {
            name,
            description,
            price,
            originalPrice,
            category,
            sizes,
            colors,
            stock,
            featured,
            shippingFee,
            metaTitle,
            metaDescription,
            metaKeywords,
            seoTitle,
            seoDescription,
            seoKeywords,
            canonicalUrl,
            ogTitle,
            ogDescription,
            ogImage
        } = req.body;

        await Product.findByIdAndUpdate(req.params.id, {
            name,
            description,
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            category,
            sizes: sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [],
            colors: colors ? (Array.isArray(colors) ? colors : [colors]) : [],
            stock: parseInt(stock),
            featured: featured === 'on',
            shippingFee: shippingFee ? parseFloat(shippingFee) : undefined,
            seoTitle: seoTitle || metaTitle || '',
            seoDescription: seoDescription || metaDescription || '',
            seoKeywords: seoKeywords || metaKeywords || '',
            metaTitle: metaTitle || seoTitle || undefined,
            metaDescription: metaDescription || seoDescription || undefined,
            metaKeywords: metaKeywords || seoKeywords || undefined,
            canonicalUrl: canonicalUrl || undefined,
            ogTitle: ogTitle || undefined,
            ogDescription: ogDescription || undefined,
            ogImage: ogImage || undefined
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
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        // Only add to history if status is actually changing
        if (order.status !== status) {
            await Order.findByIdAndUpdate(req.params.id, {
                status,
                $push: {
                    statusHistory: {
                        status,
                        timestamp: new Date(),
                        note: `Status changed to ${status} by admin`
                    }
                }
            });
        }

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

exports.generateSeo = async(req, res) => {
    try {
        const { productName, productDescription, category, price } = req.body;

        if (!productName || !productName.trim()) {
            return res.status(400).json({ error: 'Product name required' });
        }

        const prompt = `Generate SEO metadata for an e-commerce product listed on SheenClassics.
Product Name: ${productName}
Category: ${category || 'General'}
Description: ${productDescription || 'Not provided'}
Price: ${price ? `Rs ${price}` : 'Not provided'}

Return ONLY a valid JSON object with these exact keys:
{
  "seoTitle": "60 chars max, compelling, includes product name and key benefit",
  "seoDescription": "150-160 chars, includes a call-to-action and unique selling point",
  "seoKeywords": "8-12 comma-separated keywords, mix of short and long-tail",
  "ogTitle": "Social share title, engaging, under 60 chars",
  "ogDescription": "Social share description, under 200 chars"
}`;

        const raw = await groqService.callGroq([{ role: 'user', content: prompt }], '', 512, { temperature: 0.4 });
        const parsed = groqService.parseJsonFromAi(raw);

        return res.json({
            seoTitle: parsed.seoTitle || '',
            seoDescription: parsed.seoDescription || '',
            seoKeywords: parsed.seoKeywords || '',
            ogTitle: parsed.ogTitle || '',
            ogDescription: parsed.ogDescription || ''
        });
    } catch (error) {
        console.error('SEO generation error:', error);
        return res.status(500).json({ error: 'Failed to generate SEO metadata' });
    }
};

exports.getLowStock = async(req, res) => {
    try {
        const lowStockProducts = await Product.find({
            stock: { $lte: LOW_STOCK_THRESHOLD, $gt: 0 }
        }).select('name stock _id images slug').sort({ stock: 1 }).limit(20);

        const outOfStock = await Product.find({ stock: 0 })
            .select('name stock _id images slug').sort({ updatedAt: -1 }).limit(10);

        return res.json({ lowStockProducts, outOfStock, threshold: LOW_STOCK_THRESHOLD });
    } catch (error) {
        console.error('Low stock check error:', error);
        return res.status(500).json({ error: 'Failed to check stock levels' });
    }
};

exports.getSeoStudio = (req, res) => {
    Blog.find().sort({ createdAt: -1 }).limit(50)
        .then(blogs => {
            res.render('admin/seo-studio', {
                title: 'AI SEO Content Studio - SheenClassics',
                query: req.query,
                blogs
            });
        })
        .catch(error => {
            console.error('Error loading SEO studio:', error);
            res.status(500).render('error', {
                title: 'Error - SheenClassics',
                error: 'Failed to load SEO Content Studio'
            });
        });
};

exports.generateContent = async(req, res) => {
    try {
        const { type, context = {} } = req.body;

        if (!CONTENT_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid content type' });
        }

        const prompts = {
            'product-description': `Write an SEO-optimized product description for SheenClassics.
Product Name: ${context.name || 'Product'}
Category: ${context.category || 'General'}
Key Features: ${context.features || 'Not specified'}
Target Audience: ${context.audience || 'General shoppers'}
Tone: Premium, trustworthy, elegant.
Write 2-3 paragraphs with a hook, useful details, and a gentle call-to-action. Output plain text only.`,
            'category-intro': `Write a 100-150 word SEO-optimized category introduction for the "${context.categoryName || 'Featured'}" category on SheenClassics. Mention quality, product breadth, and a gentle call to action. Plain text only.`,
            'blog-post': `Write a complete SEO-optimized blog post for SheenClassics.
Topic: ${context.topic || 'Classic style essentials'}
Target keyword: ${context.keyword || context.topic || 'classic style'}
Word count: approximately 500 words.
Use markdown with one H1, 3-4 H2 sections, and a conclusion with CTA.`,
            'homepage-hero': `Write 3 variations of homepage hero copy for SheenClassics. Each variation must have headline max 8 words, subheading max 20 words, CTA max 4 words. Return ONLY a JSON array with keys headline, subheading, cta.`,
            'about-snippet': `Write a 100-word SEO-optimized About Us snippet for SheenClassics. Emphasize quality, trust, and classic style. Make it warm and human. Plain text only.`
        };

        const raw = await groqService.callGroq([{ role: 'user', content: prompts[type] }], '', 1024);
        const content = type === 'homepage-hero' ? groqService.parseJsonFromAi(raw) : raw.trim();

        return res.json({ content, type });
    } catch (error) {
        console.error('Content generation error:', error);
        return res.status(500).json({ error: 'Content generation failed. Please try again.' });
    }
};

exports.saveBlog = async(req, res) => {
    try {
        const {
            title,
            category,
            excerpt,
            content,
            seoTitle,
            seoDescription,
            featured,
            published
        } = req.body;

        if (!title || !content) {
            return res.redirect('/admin/seo-studio?error=Blog title and content are required');
        }

        const blog = new Blog({
            title: title.trim(),
            category: category || 'Style Notes',
            excerpt: excerpt || content.replace(/\s+/g, ' ').slice(0, 180),
            content,
            seoTitle: seoTitle || '',
            seoDescription: seoDescription || '',
            featured: featured === 'on',
            published: published !== 'off'
        });

        await blog.save();
        res.redirect('/admin/seo-studio?success=Blog saved and linked to home page');
    } catch (error) {
        console.error('Error saving blog:', error);
        res.redirect('/admin/seo-studio?error=Failed to save blog');
    }
};

exports.deleteBlog = async(req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.redirect('/admin/seo-studio?success=Blog deleted');
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.redirect('/admin/seo-studio?error=Failed to delete blog');
    }
};
