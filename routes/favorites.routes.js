// routes/favorites.routes.js
const express = require('express');
const router = express.Router();

const verifyJWT = require('../middleware/auth_middleware'); 
const fav = require('../controller/favorites.controller');

// all routes protected
router.use(verifyJWT);

// Add & Toggle
router.post('/', fav.addFavorite);          
router.post('/toggle', fav.toggleFavorite);  

// Remove
router.delete('/:productId', fav.removeFavorite);

// List current user's favorites (populated products)
router.get('/', verifyJWT, fav.listFavorites);

// Check single product status
router.get('/:productId/status', fav.isFavorited);

module.exports = router;
