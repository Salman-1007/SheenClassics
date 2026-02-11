// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  res.redirect('/auth/login?admin=true');
};

// Check if user is not authenticated (for login/signup pages)
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isNotAuthenticated
};

