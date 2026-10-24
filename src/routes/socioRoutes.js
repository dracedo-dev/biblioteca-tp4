const express = require('express');
const router = express.Router();
const socioController = require('../controllers/socioController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', socioController.listarSocios);
router.get('/estado/:id', socioController.cambiarEstadoSocio);
router.get('/nuevo', socioController.formularioNuevoSocio);
router.post('/nuevo', socioController.crearSocio);
router.get('/editar/:id', socioController.formularioEditarSocio);
router.post('/editar/:id', socioController.actualizarSocio);
router.post('/eliminar/:id', socioController.eliminarSocio);

module.exports = router;