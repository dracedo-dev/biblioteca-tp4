const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', categoriaController.listarCategorias);
router.post('/nuevo', categoriaController.crearCategoria);
router.post('/eliminar/:id', categoriaController.eliminarCategoria);

module.exports = router;