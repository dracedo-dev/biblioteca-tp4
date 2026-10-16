const express = require('express');
const router = express.Router();
const autorController = require('../controllers/autorController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', autorController.listarAutores);
router.post('/nuevo', autorController.crearAutor);
router.post('/eliminar/:id', autorController.eliminarAutor);

module.exports = router;