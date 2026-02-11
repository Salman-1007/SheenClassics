const User = require('../models/User');
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

exports.postLogin = async (req, res) => {
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

exports.postSignup = async (req, res) => {
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

