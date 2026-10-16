const pool = require('../config/db');

// Listar autores
exports.listarAutores = async (req, res) => {
    try {
        const [autores] = await pool.query('SELECT * FROM autor ORDER BY apellido, nombre ASC');
        res.render('autores/index', { autores, error: null });
    } catch (error) {
        console.error('Error al listar autores:', error);
        res.status(500).send('Error al obtener la lista de autores');
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

// Eliminar autor
exports.eliminarAutor = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM autor WHERE id_autor = ?', [id]);
        res.redirect('/autores');
    } catch (error) {
        console.error('Error al eliminar autor:', error);
        res.redirect('/autores');
    }
};