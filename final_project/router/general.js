'use strict';

const express = require('express');
const axios = require('axios');
const books = require('./booksdb.js');
const { isValid, users, hashPassword } = require('./auth_users.js');
const public_users = express.Router();

// Task 7: Register a new user.
public_users.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || username.trim().length === 0 ||
        typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Provide a username and a password with at least 8 characters' });
    }
    if (isValid(username)) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    const passwordHash = await hashPassword(password);
    // Recheck after the asynchronous hash, in case of simultaneous registrations.
    if (isValid(username)) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    users.push({ username, passwordHash });
    return res.status(201).json({ message: 'User registered successfully', username });
  } catch (_) {
    return res.status(500).json({ message: 'Registration error' });
  }
});

// Tasks 2-6: Public API routes using the supplied local booksdb.js dataset.
public_users.get('/', (req, res) => res.status(200).json(books));

public_users.get('/isbn/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.status(200).json(book)
    : res.status(404).json({ message: 'ISBN not found' });
});

function findBooksBy(field, search) {
  const needle = search.trim().toLowerCase();
  return Object.fromEntries(Object.entries(books).filter(([, book]) =>
    book[field].toLowerCase().includes(needle)
  ));
}

public_users.get('/author/:author', (req, res) => {
  const matches = findBooksBy('author', req.params.author);
  return Object.keys(matches).length
    ? res.status(200).json(matches)
    : res.status(404).json({ message: 'Author not found' });
});

public_users.get('/title/:title', (req, res) => {
  const matches = findBooksBy('title', req.params.title);
  return Object.keys(matches).length
    ? res.status(200).json(matches)
    : res.status(404).json({ message: 'Title not found' });
});

public_users.get('/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.status(200).json(book.reviews)
    : res.status(404).json({ message: 'ISBN not found' });
});

// Task 11 (8 points): Client-side API functions using async/await + Axios.
// These call the public API endpoints above. The route handlers themselves
// intentionally read booksdb directly, avoiding a circular HTTP request.
const BASE_URL = process.env.BOOKSTORE_API_URL ||
  `http://127.0.0.1:${process.env.PORT || 5000}`;

async function getAllBooks() {
  const response = await axios.get(`${BASE_URL}/`);
  return response.data;
}

async function getBookByISBN(isbn) {
  const response = await axios.get(`${BASE_URL}/isbn/${encodeURIComponent(isbn)}`);
  return response.data;
}

async function getBooksByAuthor(author) {
  const response = await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`);
  return response.data;
}

async function getBooksByTitle(title) {
  const response = await axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`);
  return response.data;
}

module.exports = {
  general: public_users,
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle,
};
