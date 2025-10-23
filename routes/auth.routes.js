// routes/auth.routes.js
const express = require('express');
const { register, login } = require('../Controllers/auth.controller');

const router = express.Router();

// Auth
router.post('/register', register);
router.post('/login', login);

module.exports = router;
