// routes/auth.routes.js
const express = require('express');
const authController = require('../controller/auth.controller');
const auth = require("../middleware/auth_middleware");
const router = express.Router();

// Auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authController.getallusers);
router.get('/me', auth, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
