const express = require('express');
const router = express.Router();
const prestamoController = require('../controllers/prestamoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', prestamoController.listarPrestamos);
router.get('/nuevo', prestamoController.formularioNuevoPrestamo);
router.post('/nuevo', prestamoController.crearPrestamo);
router.post('/devolver/:id', prestamoController.devolverPrestamo);

module.exports = router;