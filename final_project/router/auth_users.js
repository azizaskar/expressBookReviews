'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb.js');

const scrypt = promisify(crypto.scrypt);
const regd_users = express.Router();
const users = [];

function isValid(username) {
  return users.some((user) => user.username === username);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

async function authenticatedUser(username, password) {
  const user = users.find((entry) => entry.username === username);
  if (!user) return false;
  const [salt, hexHash] = user.passwordHash.split(':');
  const expected = Buffer.from(hexHash, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// Login: POST /customer/login, body {username, password} or form data.
regd_users.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' ||
        !(await authenticatedUser(username, password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || 'book-review-local-demo-only',
      { expiresIn: '1h' }
    );
    req.session.authorization = { accessToken: token };
    return res.status(200).json({ message: 'User successfully logged in', username });
  } catch (error) {
    return res.status(500).json({ message: 'Login error' });
  }
});

// Add/update: PUT /customer/auth/review/1?review=Great%20book
regd_users.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  const book = books[isbn];
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || review.trim().length === 0) {
    return res.status(400).json({ message: 'A non-empty review is required' });
  }

  const username = req.user.username; // Verified by the JWT middleware.
  const updating = Object.prototype.hasOwnProperty.call(book.reviews, username);
  book.reviews[username] = review.trim();
  return res.status(200).json({
    message: updating ? 'Review updated successfully' : 'Review added successfully',
    reviews: book.reviews,
  });
});

// Delete the logged-in user's own review; never delete someone else's.
regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found' });

  const username = req.user.username;
  if (!Object.prototype.hasOwnProperty.call(book.reviews, username)) {
    return res.status(404).json({ message: 'No review to delete for this user' });
  }
  delete book.reviews[username];
  return res.status(200).json({ message: 'Review deleted successfully', reviews: book.reviews });
});

module.exports = { authenticated: regd_users, isValid, users, hashPassword, authenticatedUser };
