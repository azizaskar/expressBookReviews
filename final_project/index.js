'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const customerRoutes = require('./router/auth_users.js').authenticated;
const generalRoutes = require('./router/general.js').general;

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'book-review-local-demo-only';

// Support both JSON requests and cURL's convenient form data.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// The exercise stores users and reviews in memory; this is not a production server.
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || 'book-review-session-local-demo-only',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

// All authenticated review routes require a valid JWT in the active session.
app.use('/customer/auth', (req, res, next) => {
  const token = req.session?.authorization?.accessToken;
  if (!token) {
    return res.status(401).json({ message: 'Please log in first' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_) {
    return res.status(403).json({ message: 'Invalid or expired login' });
  }
});

app.use('/customer', customerRoutes);
app.use('/', generalRoutes);

// Do not start a port if a test imports this module.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Book Review API running on http://localhost:${PORT}`));
}

module.exports = { app };
