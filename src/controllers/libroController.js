const pool = require('../config/db');

// Listar todos los libros con sus datos asociados (Autor, Editorial, Categoría)
exports.listarLibros = async (req, res) => {
    try {
        const query = `
            SELECT l.*, c.nombre AS categoria, a.nombre AS autor_nombre, a.apellido AS autor_apellido, e.nombre AS editorial
            FROM libro l
            LEFT JOIN categoria c ON l.id_categoria = c.id_categoria
            LEFT JOIN autor a ON l.id_autor = a.id_autor
            LEFT JOIN editorial e ON l.id_editorial = e.id_editorial
            ORDER BY l.id_libro DESC
        `;
        const [libros] = await pool.query(query);
        res.render('libros/index', { libros, error: null });
    } catch (error) {
        console.error('Error al listar libros:', error);
        res.status(500).send('Error al obtener la lista de libros');
    }
};

// Formulario para nuevo libro
exports.formularioNuevoLibro = async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');
        
        res.render('libros/nuevo', { categorias, autores, editoriales, error: null });
    } catch (error) {
        console.error('Error al cargar datos para nuevo libro:', error);
        res.redirect('/libros');
    }
};

// Crear libro
exports.crearLibro = async (req, res) => {
    const { titulo, isbn, anio_publicacion, id_categoria, id_autor, id_editorial } = req.body;

    try {
        await pool.query(
            'INSERT INTO libro (titulo, isbn, anio_publicacion, id_categoria, id_autor, id_editorial) VALUES (?, ?, ?, ?, ?, ?)',
            [titulo, isbn, anio_publicacion, id_categoria || null, id_autor || null, id_editorial || null]
        );
        res.redirect('/libros');
    } catch (error) {
        console.error('Error al crear libro:', error);
        
        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');
        
        res.render('libros/nuevo', { categorias, autores, editoriales, error: 'Error al registrar el libro. Verificá que el ISBN no esté repetido.' });
    }
};

// Eliminar libro
exports.eliminarLibro = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM libro WHERE id_libro = ?', [id]);
        res.redirect('/libros');
    } catch (error) {
        console.error('Error al eliminar libro:', error);
        res.redirect('/libros');
    }
};