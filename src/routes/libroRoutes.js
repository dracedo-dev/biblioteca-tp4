const express = require('express');
const router = express.Router();
const libroController = require('../controllers/libroController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', libroController.listarLibros);
router.get('/nuevo', libroController.formularioNuevoLibro);
router.post('/nuevo', libroController.crearLibro);
router.get('/editar/:id', libroController.getEditarLibro); 
router.post('/editar/:id', libroController.postEditarLibro);
router.post('/eliminar/:id', libroController.eliminarLibro);
router.get('/detalle/:id', libroController.verDetalleLibro);

module.exports = router;