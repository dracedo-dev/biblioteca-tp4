const pool = require('../config/db');

// Listar todas las categorías
exports.listarCategorias = async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM categoria ORDER BY nombre ASC');
        res.render('categorias/index', { categorias, error: null });
    } catch (error) {
        console.error('Error al listar categorías:', error);
        res.status(500).send('Error al obtener la lista de categorías');
    }
};

// Guardar nueva categoría
exports.crearCategoria = async (req, res) => {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
        const [categorias] = await pool.query('SELECT * FROM categoria ORDER BY nombre ASC');
        return res.render('categorias/index', { categorias, error: 'El nombre de la categoría es obligatorio.' });
    }

    try {
        await pool.query(
            'INSERT INTO categoria (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion || null]
        );
        res.redirect('/categorias');
    } catch (error) {
        console.error('Error al crear categoría:', error);
        const [categorias] = await pool.query('SELECT * FROM categoria ORDER BY nombre ASC');
        
        let mensajeError = 'Error al registrar la categoría.';
        if (error.code === 'ER_DUP_ENTRY') {
            mensajeError = 'Ya existe una categoría con ese nombre.';
        }
        res.render('categorias/index', { categorias, error: mensajeError });
    }
};

// Eliminar categoría
exports.eliminarCategoria = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM categoria WHERE id_categoria = ?', [id]);
        res.redirect('/categorias');
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.redirect('/categorias');
    }
};