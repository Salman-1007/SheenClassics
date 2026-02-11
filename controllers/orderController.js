const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');

exports.getOrderSummary = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.redirect('/account?tab=cart');
    }
    
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.product.price * item.quantity;
    });
    
    res.render('order-summary', {
      title: 'Order Summary - SheenClassics',
      cart,
      subtotal,
      discount: 0,
      total: subtotal,
      couponCode: ''
    });
  } catch (error) {
    console.error('Error fetching order summary:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load order summary'
    });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Cart is empty' });
    }
    
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.product.price * item.quantity;
    });
    
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    
    if (!coupon || !coupon.isValid()) {
      return res.json({ success: false, message: 'Invalid or expired coupon code' });
    }
    
    if (subtotal < coupon.minPurchase) {
      return res.json({ 
        success: false, 
        message: `Minimum purchase of $${coupon.minPurchase} required` 
      });
    }
    
    const discount = coupon.calculateDiscount(subtotal);
    const total = subtotal - discount;
    
    res.json({
      success: true,
      discount,
      total,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.json({ success: false, message: 'Failed to apply coupon' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    const { shippingAddress, couponCode, paymentMethod, jazzcashNumber, whatsappNumber } = req.body;
    
    const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.redirect('/account?tab=cart');
    }
    
    // Validate stock availability before creating order
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.render('order-summary', {
          title: 'Order Summary - SheenClassics',
          cart,
          subtotal: 0,
          discount: 0,
          total: 0,
          couponCode: '',
          error: `Product "${item.product.name}" is no longer available`
        });
      }
      
      if (item.quantity > product.stock) {
        return res.render('order-summary', {
          title: 'Order Summary - SheenClassics',
          cart,
          subtotal: 0,
          discount: 0,
          total: 0,
          couponCode: '',
          error: `Only ${product.stock} items available for "${item.product.name}"`
        });
      }
    }
    
    let subtotal = 0;
    const orderItems = cart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      subtotal += itemTotal;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        size: item.size,
        color: item.color
      };
    });
    
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isValid() && subtotal >= coupon.minPurchase) {
        discount = coupon.calculateDiscount(subtotal);
        coupon.usedCount += 1;
        await coupon.save();
      }
    }
    
    const total = subtotal - discount;

    // Enforce WhatsApp-only confirmation and validate WhatsApp number
    const cleanWhatsappNumber = (whatsappNumber || '').trim();
    const whatsappPattern = /^(03\d{9}|\+92\d{10})$/;

    if (paymentMethod !== 'whatsapp') {
      return res.render('order-summary', {
        title: 'Order Summary - SheenClassics',
        cart,
        subtotal,
        discount,
        total,
        couponCode: couponCode || '',
        error: 'Currently, orders are confirmed only via WhatsApp. Please use your WhatsApp number to place the order.'
      });
    }

    if (!cleanWhatsappNumber || !whatsappPattern.test(cleanWhatsappNumber)) {
      return res.render('order-summary', {
        title: 'Order Summary - SheenClassics',
        cart,
        subtotal,
        discount,
        total,
        couponCode: couponCode || '',
        error: 'Please enter a valid WhatsApp number in 03XXXXXXXXX or +923XXXXXXXXXX format.'
      });
    }
    
    // Prepare payment details
    const paymentDetails = {
      whatsappNumber: cleanWhatsappNumber
    };
    
    const order = new Order({
      user: req.session.userId,
      items: orderItems,
      subtotal,
      discount,
      couponCode: couponCode || null,
      total,
      shippingAddress,
      paymentMethod,
      paymentDetails
    });
    
    await order.save();
    
    // Decrease product stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
      }
    }
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    res.redirect(`/orders/${order._id}`);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to create order'
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).render('404', { title: 'Order Not Found - SheenClassics' });
    }
    
    if (order.user._id.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).render('error', {
        title: 'Access Denied - SheenClassics',
        error: 'You do not have permission to view this order'
      });
    }
    
    res.render('order-detail', {
      title: `Order #${order._id} - SheenClassics`,
      order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).render('error', {
      title: 'Error - SheenClassics',
      error: 'Failed to load order'
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
    
    const orders = await Order.find({ user: req.session.userId })
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.render('orders', {
      title: 'My Orders - SheenClassics',
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

exports.cancelOrder = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: 'Please login first' });
    }

    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== req.session.userId && !req.session.isAdmin) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    // Only allow cancellation if order is pending or processing
    if (!['pending', 'processing'].includes(order.status)) {
      return res.json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product._id || item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // Update order status (skip validation so old orders without paymentMethod can be updated)
    order.status = 'cancelled';
    await order.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.json({ success: false, message: 'Failed to cancel order' });
  }
};

