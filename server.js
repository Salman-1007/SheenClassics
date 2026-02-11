const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
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
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/sheenclassics'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make session available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sheenclassics', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/cart', require('./routes/cart'));
app.use('/wishlist', require('./routes/wishlist'));
app.use('/orders', require('./routes/orders'));
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
  console.log(`Server running on http://localhost:${PORT}`);
});

