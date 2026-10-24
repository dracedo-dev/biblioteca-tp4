const pool = require('../config/db');

// Listar ejemplares (con opción de filtrar por libro)
exports.listarEjemplares = async (req, res) => {
    try {
        const [ejemplares] = await pool.query(`
            SELECT e.*, l.titulo AS libro_titulo 
            FROM ejemplar e
            JOIN libro l ON e.id_libro = l.id_libro
            ORDER BY e.id_ejemplar DESC
        `);
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        res.render('ejemplares/index', { ejemplares, libros, error: null });
    } catch (error) {
        console.error('Error al listar ejemplares:', error);
        res.redirect('/dashboard');
    }
};

// Crear Ejemplar
exports.crearEjemplar = async (req, res) => {
    const { codigo_inventario, id_libro, estado } = req.body;
    try {
        // Validar código de inventario único
        const [existente] = await pool.query('SELECT * FROM ejemplar WHERE codigo_inventario = ?', [codigo_inventario.trim()]);
        if (existente.length > 0) {
            const [ejemplares] = await pool.query(`
                SELECT e.*, l.titulo AS libro_titulo FROM ejemplar e JOIN libro l ON e.id_libro = l.id_libro ORDER BY e.id_ejemplar DESC
            `);
            const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
            return res.render('ejemplares/index', {
                ejemplares, libros, error: 'El código de inventario ya existe.'
            });
        }

        await pool.query(
            'INSERT INTO ejemplar (codigo_inventario, id_libro, estado) VALUES (?, ?, ?)',
            [codigo_inventario.trim(), id_libro, estado || 'Disponible']
        );
        res.redirect('/ejemplares');
    } catch (error) {
        console.error('Error al crear ejemplar:', error);
        res.redirect('/ejemplares');
    }
};

// Cambiar Estado / Editar Ejemplar
exports.actualizarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body; // 'Disponible', 'Prestado', 'Dañado', 'En mantenimiento'
    try {
        await pool.query('UPDATE ejemplar SET estado = ? WHERE id_ejemplar = ?', [estado, id]);
        res.redirect('/ejemplares');
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.redirect('/ejemplares');
    }
};

// Eliminar Ejemplar
exports.eliminarEjemplar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM ejemplar WHERE id_ejemplar = ?', [id]);
        res.redirect('/ejemplares');
    } catch (error) {
        console.error('Error al eliminar ejemplar:', error);
        res.redirect('/ejemplares');
    }
};