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
// Crear Préstamo con validación de estado activo y límite de 3 préstamos
// Crear Préstamo respetando la gestión independiente de Ejemplares y Estados
exports.crearPrestamo = async (req, res) => {
    const { id_socio, id_libro, fecha_prestamo, fecha_vencimiento } = req.body;

    try {
        // 1. VALIDACIÓN A: Verificar que el socio esté ACTIVO
        const [socioData] = await pool.query('SELECT estado FROM socio WHERE id_socio = ?', [id_socio]);
        if (socioData.length === 0 || socioData[0].estado !== 'Activo') {
            const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
            const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
            return res.render('prestamos/nuevo', {
                socios,
                libros,
                error: 'No se puede registrar un préstamo para un socio inactivo.'
            });
        }

        // 2. VALIDACIÓN B: Verificar que el socio no tenga más de 3 préstamos activos
        const [prestamosActivos] = await pool.query(
            'SELECT COUNT(*) AS total FROM prestamo WHERE id_socio = ? AND estado = "Activo"',
            [id_socio]
        );
        if (prestamosActivos[0].total >= 3) {
            const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
            const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
            return res.render('prestamos/nuevo', {
                socios,
                libros,
                error: 'El socio ya posee el límite máximo de 3 préstamos activos.'
            });
        }

        // 3. VALIDACIÓN C: Verificar si el socio YA tiene un préstamo activo de este mismo libro
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

        // 4. NUEVA LÓGICA DE EJEMPLARES: Buscar un ejemplar de este libro que esté 'Disponible'
        const [ejemplaresDisponibles] = await pool.query(
            'SELECT id_ejemplar FROM ejemplar WHERE id_libro = ? AND estado = "Disponible" LIMIT 1',
            [id_libro]
        );

        // Si no hay ningún ejemplar en estado 'Disponible', rehusar el préstamo
        if (ejemplaresDisponibles.length === 0) {
            const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
            const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
            return res.render('prestamos/nuevo', {
                socios,
                libros,
                error: 'No hay ejemplares disponibles para este libro en este momento.'
            });
        }

        const id_ejemplar = ejemplaresDisponibles[0].id_ejemplar;

        // 5. Registrar la cabecera del préstamo
        const [resPrestamo] = await pool.query(
            'INSERT INTO prestamo (id_socio, fecha_prestamo, fecha_vencimiento, estado) VALUES (?, ?, ?, ?)',
            [id_socio, fecha_prestamo, fecha_vencimiento, 'Activo']
        );

        const id_prestamo = resPrestamo.insertId;

        // 6. Registrar en detalle_prestamo
        await pool.query(
            'INSERT INTO detalle_prestamo (id_prestamo, id_ejemplar) VALUES (?, ?)',
            [id_prestamo, id_ejemplar]
        );

        // 7. CAMBIO DE ESTADO AUTOMÁTICO: Pasar el ejemplar prestado a estado 'Prestado'
        await pool.query(
            'UPDATE ejemplar SET estado = "Prestado" WHERE id_ejemplar = ?',
            [id_ejemplar]
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

// Devolver Préstamo
exports.devolverPrestamo = async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado_ejemplar } = req.body; // 'Disponible', 'Dañado' o 'En mantenimiento'
    const fechaHoy = new Date().toISOString().split('T')[0];

    try {
        // 1. Marcar el préstamo como Devuelto
        await pool.query(
            'UPDATE prestamo SET estado = "Devuelto", fecha_devolucion = ? WHERE id_prestamo = ?',
            [fechaHoy, id]
        );

        // 2. Obtener el id_ejemplar del detalle
        const [detalle] = await pool.query(
            'SELECT id_ejemplar FROM detalle_prestamo WHERE id_prestamo = ?',
            [id]
        );

        if (detalle.length > 0) {
            const id_ejemplar = detalle[0].id_ejemplar;
            const estadoFinal = nuevo_estado_ejemplar || 'Disponible';

            // 3. Devolver el ejemplar a 'Disponible' (o el estado asignado)
            await pool.query(
                'UPDATE ejemplar SET estado = ? WHERE id_ejemplar = ?',
                [estadoFinal, id_ejemplar]
            );
        }

        res.redirect('/prestamos');
    } catch (error) {
        console.error('Error al devolver préstamo:', error);
        res.redirect('/prestamos');
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