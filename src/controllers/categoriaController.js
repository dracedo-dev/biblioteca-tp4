const pool = require('../config/db');

// Listar Categorías (con Buscador)
exports.listarCategorias = async (req, res) => {
    const buscar = req.query.buscar || '';
    try {
        const [categorias] = await pool.query(
            'SELECT * FROM categoria WHERE nombre LIKE ? ORDER BY id_categoria DESC',
            [`%${buscar}%`]
        );
        res.render('categorias/index', { categorias, buscar, error: null });
    } catch (error) {
        console.error('Error al listar categorías:', error);
        res.status(500).send('Error al cargar categorías');
    }
};

// Crear Categoría (con validación de NO duplicados)
exports.crearCategoria = async (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.redirect('/categorias');
    }

    try {
        // Verificar si la categoría ya existe (sin importar mayúsculas/minúsculas)
        const [existente] = await pool.query(
            'SELECT * FROM categoria WHERE LOWER(nombre) = LOWER(?)',
            [nombre.trim()]
        );

        if (existente.length > 0) {
            // Cargar la lista actual y devolver render con mensaje de error y variable 'buscar'
            const [categorias] = await pool.query('SELECT * FROM categoria ORDER BY id_categoria DESC');
            return res.render('categorias/index', {
                categorias,
                buscar: '',
                error: 'La categoría ya existe en la base de datos.'
            });
        }

        await pool.query('INSERT INTO categoria (nombre) VALUES (?)', [nombre.trim()]);
        res.redirect('/categorias');
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.redirect('/categorias');
    }
};

// Vista Editar
exports.formularioEditar = async (req, res) => {
    const { id } = req.params;
    try {
        const [categorias] = await pool.query('SELECT * FROM categoria WHERE id_categoria = ?', [id]);
        if (categorias.length === 0) return res.redirect('/categorias');
        res.render('categorias/editar', { categoria: categorias[0], error: null });
    } catch (error) {
        res.redirect('/categorias');
    }
};

// Editar Categoría (con validación de NO duplicados)
// Ejemplo para Categoria (aplica exacto para Autor y Editorial cambiando nombres de tabla/campos)
exports.getEditarCategoria = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM categoria WHERE id_categoria = ?', [id]);
        if (rows.length === 0) return res.redirect('/categorias');
        res.render('categorias/editar', { categoria: rows[0], error: null });
    } catch (error) {
        res.redirect('/categorias');
    }
};

exports.postEditarCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;

    try {
        const [existente] = await pool.query(
            'SELECT * FROM categoria WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?',
            [nombre.trim(), id]
        );

        if (existente.length > 0) {
            return res.render('categorias/editar', {
                categoria: { id_categoria: id, nombre },
                error: 'Ya existe otra categoría con ese nombre.'
            });
        }

        await pool.query('UPDATE categoria SET nombre = ? WHERE id_categoria = ?', [nombre.trim(), id]);
        res.redirect('/categorias');
    } catch (error) {
        res.redirect('/categorias');
    }
};

// Eliminar Categoría
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