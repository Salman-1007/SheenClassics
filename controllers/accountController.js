const User = require('../models/User');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');

exports.getAccount = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    const { tab } = req.query;
    const activeTab = tab || 'profile';
    
    const user = await User.findById(req.session.userId);
    
    // Get cart
    let cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    if (!cart) {
      cart = { items: [] };
    }
    
    // Get wishlist
    let wishlist = await Wishlist.findOne({ user: req.session.userId }).populate('products');
    if (!wishlist) {
      wishlist = { products: [] };
    }
    
    // Get orders
    const orders = await Order.find({ user: req.session.userId })
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    // Calculate cart subtotal and validate stock
    let cartSubtotal = 0;
    if (cart.items && cart.items.length > 0) {
      cart.items.forEach(item => {
        cartSubtotal += item.product.price * item.quantity;
        // Update item stock info for display
        if (item.quantity > item.product.stock) {
          item.stockWarning = true;
        }
      });
    }
    
    res.render('account', {
      title: 'My Account - SheenClassics',
      user,
      cart,
      wishlist,
      orders,
      cartSubtotal,
      activeTab,
      query: req.query
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load account'
    });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    const { name, phone, street, city, state, zipCode, country } = req.body;
    const user = await User.findById(req.session.userId);
    
    user.name = name;
    user.phone = phone;
    user.address = {
      street,
      city,
      state,
      zipCode,
      country
    };
    
    await user.save();
    
    req.session.userName = user.name;
    
    res.redirect('/account?success=Profile updated successfully');
  } catch (error) {
    console.error('Error updating account:', error);
    res.redirect('/account?error=Failed to update profile');
  }
};

