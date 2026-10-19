const pool = require('../config/db');

// Listar Préstamos con el título del libro obtenido mediante JOIN
exports.listarPrestamos = async (req, res) => {
    const buscar = req.query.buscar || '';
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 5;
    const offset = (pagina - 1) * limite;

    try {
        const [totalRows] = await pool.query(
            `SELECT COUNT(DISTINCT p.id_prestamo) as total 
             FROM prestamo p 
             JOIN socio s ON p.id_socio = s.id_socio 
             WHERE s.nombre LIKE ? OR s.apellido LIKE ? OR s.dni LIKE ?`,
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );
        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite) || 1;

        const query = `
            SELECT p.*, 
                   s.nombre AS socio_nombre, s.apellido AS socio_apellido, s.dni AS socio_dni,
                   l.titulo AS libro_titulo
            FROM prestamo p
            JOIN socio s ON p.id_socio = s.id_socio
            LEFT JOIN detalle_prestamo dp ON p.id_prestamo = dp.id_prestamo
            LEFT JOIN ejemplar ej ON dp.id_ejemplar = ej.id_ejemplar
            LEFT JOIN libro l ON ej.id_libro = l.id_libro
            WHERE s.nombre LIKE ? OR s.apellido LIKE ? OR s.dni LIKE ?
            ORDER BY p.id_prestamo DESC LIMIT ? OFFSET ?
        `;
        const [prestamos] = await pool.query(query, [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, limite, offset]);

        res.render('prestamos/index', {
            prestamos,
            buscar,
            paginaActual: pagina,
            totalPaginas,
            error: null
        });
    } catch (error) {
        console.error('Error al listar préstamos:', error);
        res.status(500).send('Error al obtener la lista de préstamos');
    }
};

// Vista para el formulario de nuevo préstamo
exports.formularioNuevoPrestamo = async (req, res) => {
    try {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        res.render('prestamos/nuevo', { socios, libros, error: null });
    } catch (error) {
        console.error('Error al cargar formulario de préstamo:', error);
        res.redirect('/prestamos');
    }
};

// Crear Préstamo
// Crear Préstamo con validación estricta de NO duplicados
exports.crearPrestamo = async (req, res) => {
    const { id_socio, id_libro, fecha_prestamo, fecha_vencimiento } = req.body;

    try {
        // 1. Validar si el socio YA TIENE este mismo libro en estado 'Activo'
        const [prestamoDuplicado] = await pool.query(
            `SELECT p.id_prestamo 
             FROM prestamo p
             JOIN detalle_prestamo dp ON p.id_prestamo = dp.id_prestamo
             JOIN ejemplar ej ON dp.id_ejemplar = ej.id_ejemplar
             WHERE p.id_socio = ? AND ej.id_libro = ? AND p.estado = 'Activo'`,
            [id_socio, id_libro]
        );

        if (prestamoDuplicado.length > 0) {
            const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
            const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
            return res.render('prestamos/nuevo', {
                socios,
                libros,
                error: 'El socio ya tiene un préstamo activo para este libro. Debe devolverlo antes de solicitarlo nuevamente.'
            });
        }

        // 2. Buscar si hay al menos un ejemplar registrado para este libro
        let [ejemplares] = await pool.query(
            'SELECT id_ejemplar FROM ejemplar WHERE id_libro = ? LIMIT 1',
            [id_libro]
        );

        let id_ejemplar;

        if (ejemplares.length === 0) {
            const codigoInventario = `INV-${id_libro}-001`;
            const [nuevoEjemplar] = await pool.query(
                'INSERT INTO ejemplar (codigo_inventario, estado, id_libro) VALUES (?, ?, ?)',
                [codigoInventario, 'Disponible', id_libro]
            );
            id_ejemplar = nuevoEjemplar.insertId;
        } else {
            id_ejemplar = ejemplares[0].id_ejemplar;
        }

        // 3. Guardar en prestamo
        const [resPrestamo] = await pool.query(
            'INSERT INTO prestamo (id_socio, fecha_prestamo, fecha_vencimiento, estado) VALUES (?, ?, ?, ?)',
            [id_socio, fecha_prestamo, fecha_vencimiento, 'Activo']
        );

        const id_prestamo = resPrestamo.insertId;

        // 4. Guardar detalle en detalle_prestamo
        await pool.query(
            'INSERT INTO detalle_prestamo (id_prestamo, id_ejemplar) VALUES (?, ?)',
            [id_prestamo, id_ejemplar]
        );

        res.redirect('/prestamos');
    } catch (error) {
        console.error('ERROR AL CREAR PRESTAMO:', error);
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        res.render('prestamos/nuevo', {
            socios,
            libros,
            error: 'Ocurrió un error al registrar el préstamo: ' + (error.sqlMessage || error.message)
        });
    }
};

// Marcar préstamo como devuelto
exports.devolverPrestamo = async (req, res) => {
    const { id } = req.params;
    const fechaHoy = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            'UPDATE prestamo SET estado = ?, fecha_devolucion = ? WHERE id_prestamo = ?',
            ['Devuelto', fechaHoy, id]
        );
        res.redirect('/prestamos');
    } catch (error) {
        console.error('Error al devolver préstamo:', error);
        res.redirect('/prestamos');
    }
};