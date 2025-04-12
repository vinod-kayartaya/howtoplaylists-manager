// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  
  // Store the original URL to redirect back after login
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  res.redirect('/auth/login');
};

// Middleware to check if user is NOT authenticated
const isNotAuthenticated = (req, res, next) => {
  if (!req.session.isAuthenticated) {
    return next();
  }
  
  // Redirect to home page
  res.redirect('/');
};

// Middleware to add auth status to all templates
const addAuthToTemplates = (req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.user = req.session.user || null;
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  addAuthToTemplates
}; 