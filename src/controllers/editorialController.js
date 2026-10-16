const pool = require('../config/db');

// Listar editoriales
exports.listarEditoriales = async (req, res) => {
    try {
        const [editoriales] = await pool.query('SELECT * FROM editorial ORDER BY nombre ASC');
        res.render('editoriales/index', { editoriales, error: null });
    } catch (error) {
        console.error('Error al listar editoriales:', error);
        res.status(500).send('Error al obtener la lista de editoriales');
    }
};

// Crear editorial
exports.crearEditorial = async (req, res) => {
    const { nombre } = req.body;

    if (!nombre) {
        const [editoriales] = await pool.query('SELECT * FROM editorial ORDER BY nombre ASC');
        return res.render('editoriales/index', { editoriales, error: 'El nombre de la editorial es obligatorio.' });
    }

    try {
        await pool.query('INSERT INTO editorial (nombre) VALUES (?)', [nombre]);
        res.redirect('/editoriales');
    } catch (error) {
        console.error('Error al crear editorial:', error);
        const [editoriales] = await pool.query('SELECT * FROM editorial ORDER BY nombre ASC');
        res.render('editoriales/index', { editoriales, error: 'Error al registrar la editorial.' });
    }
};

// Eliminar editorial
exports.eliminarEditorial = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM editorial WHERE id_editorial = ?', [id]);
        res.redirect('/editoriales');
    } catch (error) {
        console.error('Error al eliminar editorial:', error);
        res.redirect('/editoriales');
    }
};