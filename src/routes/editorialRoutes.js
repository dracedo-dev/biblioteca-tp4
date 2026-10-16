const express = require('express');
const router = express.Router();
const editorialController = require('../controllers/editorialController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', editorialController.listarEditoriales);
router.post('/nuevo', editorialController.crearEditorial);
router.post('/eliminar/:id', editorialController.eliminarEditorial);

module.exports = router;