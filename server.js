const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'sheenclassics-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    }
}));

// Make session available to all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// SEO defaults for all pages
app.use((req, res, next) => {
    const siteName = 'SheenClassics';
    const defaultDescription = 'Discover premium embroidered fashion for men, women and kids from SheenClassics.';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.locals.metaTitle = `${siteName} — Premium Embroidered Clothing`;
    res.locals.metaDescription = defaultDescription;
    res.locals.metaKeywords = 'SheenClassics, embroidered, fashion, clothing';
    res.locals.metaRobots = 'index, follow';

    res.locals.canonicalUrl = `${baseUrl}${req.path}`;
    res.locals.ogTitle = `${siteName} — Premium Embroidered Clothing`;
    res.locals.ogDescription = defaultDescription;
    res.locals.ogImage = '/images/logoc.jpg';
    res.locals.twitterCard = 'summary_large_image';

    next();
});

// Database connection
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not defined");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/cart', require('./routes/cart'));
app.use('/wishlist', require('./routes/wishlist'));
app.use('/orders', require('./routes/orders'));
app.use('/chatbot', require('./routes/chat'));
app.use('/account', require('./routes/account'));
app.use('/admin', require('./routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        error: err.message,
        title: 'Error - SheenClassics'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found - SheenClassics' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});