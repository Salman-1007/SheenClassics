const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.getAllProducts = async(req, res) => {
    try {
        const { category, search, sort } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = {};
        switch (sort) {
            case 'price-low':
                sortOption = { price: 1 };
                break;
            case 'price-high':
                sortOption = { price: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const products = await Product.find(query).sort(sortOption);

        const safeCategory = category ? category : 'All Products';
        const safeSearch = search ? search : '';

        const metaTitle = search ?
            `Search results for "${search}" | SheenClassics` :
            category ?
            `${category} Collection | SheenClassics` :
            'Products | SheenClassics';

        const metaDescription = search ?
            `Search results for "${search}" across SheenClassics products.` :
            category ?
            `Browse ${category} products in SheenClassics collection.` :
            'Browse all products in SheenClassics collection.';

        const metaKeywords = [
            'SheenClassics',
            safeCategory,
            safeSearch,
            'embroidered',
            'fashion'
        ].filter(Boolean).join(', ');

        res.render('products', {
            title: 'Products - SheenClassics',
            products,
            currentCategory: category || 'All',
            searchQuery: search || '',
            sortOption: sort || 'newest',
            metaTitle,
            metaDescription,
            metaKeywords,
            ogTitle: metaTitle,
            ogDescription: metaDescription,
            ogImage: '/images/logoc.jpg',
            canonicalUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load products'
        });
    }
};

exports.getProduct = async(req, res) => {
    try {
        const { identifier } = req.params;
        let product;

        // Build query based on identifier format
        let query;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            // If it's a valid ObjectId, search by both slug and ID
            query = {
                $or: [
                    { slug: identifier.toLowerCase() },
                    { _id: identifier }
                ]
            };
        } else {
            // If it's not a valid ObjectId, search only by slug
            query = { slug: identifier.toLowerCase() };
        }

        product = await Product.findOne(query);

        if (!product) {
            return res.status(404).render('404', { title: 'Product Not Found - SheenClassics' });
        }

        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id }
        }).limit(4);

        const fallbackDescription = product.description ? product.description.substring(0, 160) : 'SheenClassics product.';
        const computedMetaTitle = product.seoTitle || product.metaTitle || `${product.name} | SheenClassics`;
        const computedMetaDescription = product.seoDescription || product.metaDescription || fallbackDescription;
        const computedMetaKeywords = product.seoKeywords || product.metaKeywords || `${product.category}, ${product.name}, SheenClassics`;
        const computedCanonical = product.canonicalUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const computedOgTitle = product.ogTitle || computedMetaTitle;
        const computedOgDescription = product.ogDescription || computedMetaDescription;
        const computedOgImage = product.ogImage || (product.images && product.images.length > 0 ? product.images[0] : '/images/logoc.jpg');

        res.render('product-detail', {
            title: `${product.name} - SheenClassics`,
            product,
            relatedProducts,
            metaTitle: computedMetaTitle,
            metaDescription: computedMetaDescription,
            metaKeywords: computedMetaKeywords,
            canonicalUrl: computedCanonical,
            ogTitle: computedOgTitle,
            ogDescription: computedOgDescription,
            ogImage: computedOgImage,
            ogType: 'product',
            structuredData: {
                '@context': 'https://schema.org',
                '@type': product.structuredDataType || 'Product',
                name: product.name,
                description: product.description,
                image: product.images || [],
                category: product.category,
                sku: product._id.toString(),
                offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'PKR',
                    availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    url: computedCanonical
                }
            }
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load product'
        });
    }
};
