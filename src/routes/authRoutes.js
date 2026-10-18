const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);
router.post('/registro', authController.postRegistro);
router.get('/registro', authController.getRegistro);

module.exports = router;