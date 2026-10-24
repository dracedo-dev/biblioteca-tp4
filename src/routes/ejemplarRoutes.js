const express = require('express');
const router = express.Router();
const ejemplarController = require('../controllers/ejemplarController');


router.get('/', ejemplarController.listarEjemplares);
router.post('/nuevo', ejemplarController.crearEjemplar);
router.post('/estado/:id', ejemplarController.actualizarEstado);
router.post('/eliminar/:id', ejemplarController.eliminarEjemplar);

module.exports = router;