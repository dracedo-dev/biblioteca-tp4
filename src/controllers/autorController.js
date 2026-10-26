const pool = require('../config/db');

// Listar autores
exports.listarAutores = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';

    try {
        let query = 'SELECT * FROM autor';
        let countQuery = 'SELECT COUNT(*) AS total FROM autor';
        let queryParams = [];

        if (buscar) {
            query += ' WHERE nombre LIKE ?';
            countQuery += ' WHERE nombre LIKE ?';
            queryParams.push(`%${buscar}%`);
        }

        const [totalRows] = await pool.query(countQuery, queryParams);
        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limit);

        query += ' ORDER BY id_autor DESC LIMIT ? OFFSET ?';
        const [autores] = await pool.query(query, [...queryParams, limit, offset]);

        res.render('autores/index', {
            autores,
            paginaActual: page,
            totalPaginas,
            buscar,
            error: req.query.error || null // Mostrar mensaje de error si existe en la query
        });
    } catch (error) {
        console.error('Error al listar autores:', error);
        res.redirect('/dashboard');
    }
};

// Crear autor
exports.crearAutor = async (req, res) => {
    const { nombre, apellido } = req.body;

    if (!nombre || !apellido) {
        const [autores] = await pool.query('SELECT * FROM autor ORDER BY apellido, nombre ASC');
        return res.render('autores/index', { autores, error: 'El nombre y apellido son obligatorios.' });
    }

    try {
        await pool.query(
            'INSERT INTO autor (nombre, apellido) VALUES (?, ?)',
            [nombre, apellido]
        );
        res.redirect('/autores');
    } catch (error) {
        console.error('Error al crear autor:', error);
        const [autores] = await pool.query('SELECT * FROM autor ORDER BY apellido, nombre ASC');
        res.render('autores/index', { autores, error: 'Error al registrar el autor en la base de datos.' });
    }
};

// Ejemplo para Categoria (aplica exacto para Autor y Editorial cambiando nombres de tabla/campos)
exports.getEditarAutor = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM autor WHERE id_autor = ?', [id]);
        if (rows.length === 0) return res.redirect('/autores');
        res.render('autores/editar', { autor: rows[0], error: null });
    } catch (error) {
        res.redirect('/autores');
    }
};

exports.postEditarAutor = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido } = req.body;

    try {
        const [existente] = await pool.query(
            'SELECT * FROM autor WHERE (LOWER(nombre) = LOWER(?) AND LOWER(apellido) = LOWER(?)) AND id_autor != ?',
            [nombre.trim(), apellido.trim(), id]
        );

        if (existente.length > 0) {
            return res.render('autores/editar', {
                autor: { id_autor: id, nombre, apellido },
                error: 'Ya existe otro autor con ese nombre y apellido.'
            });
        }

        await pool.query('UPDATE autor SET nombre = ?, apellido = ? WHERE id_autor = ?', [nombre.trim(), apellido.trim(), id]);
        res.redirect('/autores');
    } catch (error) {
        res.redirect('/autores');
    }
};

// Eliminar autor
exports.eliminarAutor = async (req, res) => {
    const { id } = req.params;
    try {
        const [librosAsociados] = await pool.query('SELECT * FROM libro WHERE id_autor = ?', [id]);
        
        if (librosAsociados.length > 0) {
            const mensaje = encodeURIComponent('No se puede eliminar el autor porque tiene libros registrados.');
            return res.redirect(`/autores?error=${mensaje}`);
        }

        await pool.query('DELETE FROM autor WHERE id_autor = ?', [id]);
        res.redirect('/autores');
    } catch (error) {
        console.error('Error al eliminar autor:', error);
        res.redirect('/autores');
    }
};