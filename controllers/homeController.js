const Product = require('../models/Product');
const User = require('../models/User');

exports.getHome = async(req, res) => {
    try {
        const featuredProducts = await Product.find({ featured: true }).limit(8);
        const newProducts = await Product.find().sort({ createdAt: -1 }).limit(8);

        let user = null;
        if (req.session.userId) {
            user = await User.findById(req.session.userId);
        }

        const metaTitle = 'Home | SheenClassics';
        const metaDescription = 'Explore the latest and featured embroidered clothing from SheenClassics. Shop curated styles for every season.';
        const metaKeywords = 'SheenClassics, home, featured products, embroidered clothing';

        res.render('home', {
            title: 'Home - SheenClassics',
            featuredProducts,
            newProducts,
            user,
            metaTitle,
            metaDescription,
            metaKeywords,
            ogTitle: metaTitle,
            ogDescription: metaDescription,
            ogImage: '/images/logoc.jpg',
            canonicalUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        });
    } catch (error) {
        console.error('Error fetching home page:', error);
        res.status(500).render('error', {
            title: 'Error - SheenClassics',
            error: 'Failed to load home page'
        });
    }
};