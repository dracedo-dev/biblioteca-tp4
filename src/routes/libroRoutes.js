const express = require('express');
const router = express.Router();
const libroController = require('../controllers/libroController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', libroController.listarLibros);
router.get('/nuevo', libroController.formularioNuevoLibro);
router.post('/nuevo', libroController.crearLibro);
router.post('/eliminar/:id', libroController.eliminarLibro);

module.exports = router;