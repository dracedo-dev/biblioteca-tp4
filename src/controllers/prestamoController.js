const pool = require('../config/db');

// Listar Préstamos con el título del libro obtenido mediante JOIN
exports.listarPrestamos = async (req, res) => {
    try {
        const { estado, socio, fecha_desde, fecha_hasta } = req.query;
        const pagina = parseInt(req.query.pagina) || 1;
        const porPagina = 5;
        const offset = (pagina - 1) * porPagina;

        let condiciones = [];
        let parametros = [];

        if (estado) {
            condiciones.push('p.estado = ?');
            parametros.push(estado);
        }
        if (socio) {
            condiciones.push('(s.nombre LIKE ? OR s.apellido LIKE ? OR s.dni LIKE ?)');
            parametros.push(`%${socio}%`, `%${socio}%`, `%${socio}%`);
        }
        if (fecha_desde) {
            condiciones.push('p.fecha_prestamo >= ?');
            parametros.push(fecha_desde);
        }
        if (fecha_hasta) {
            condiciones.push('p.fecha_prestamo <= ?');
            parametros.push(fecha_hasta);
        }

        let whereClause = condiciones.length > 0 ? 'WHERE ' + condiciones.join(' AND ') : '';

        // 1. Total para la paginación
        const [totalRows] = await pool.query(`
            SELECT COUNT(DISTINCT p.id_prestamo) AS total
            FROM prestamo p
            JOIN socio s ON p.id_socio = s.id_socio
            LEFT JOIN detalle_prestamo dp ON p.id_prestamo = dp.id_prestamo
            LEFT JOIN ejemplar e ON dp.id_ejemplar = e.id_ejemplar
            LEFT JOIN libro l ON e.id_libro = l.id_libro
            LEFT JOIN autor a ON l.id_autor = a.id_autor
            LEFT JOIN categoria c ON l.id_categoria = c.id_categoria
            ${whereClause}
        `, parametros);

        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / porPagina) || 1;

        // 2. Consulta principal con todos los JOINs
        const queryPrestamos = `
            SELECT p.*, s.nombre AS socio_nombre, s.apellido AS socio_apellido, s.dni,
                   GROUP_CONCAT(l.titulo SEPARATOR ', ') AS libros_titulos,
                   GROUP_CONCAT(a.nombre SEPARATOR ', ') AS autores_nombres,
                   GROUP_CONCAT(c.nombre SEPARATOR ', ') AS categorias_nombres,
                   SUM(dp.dias_atraso) AS total_dias_atraso,
                   SUM(dp.multa) AS total_multa
            FROM prestamo p
            JOIN socio s ON p.id_socio = s.id_socio
            LEFT JOIN detalle_prestamo dp ON p.id_prestamo = dp.id_prestamo
            LEFT JOIN ejemplar e ON dp.id_ejemplar = e.id_ejemplar
            LEFT JOIN libro l ON e.id_libro = l.id_libro
            LEFT JOIN autor a ON l.id_autor = a.id_autor
            LEFT JOIN categoria c ON l.id_categoria = c.id_categoria
            ${whereClause}
            GROUP BY p.id_prestamo
            ORDER BY p.id_prestamo DESC
            LIMIT ? OFFSET ?
        `;

        const [prestamos] = await pool.query(queryPrestamos, [...parametros, porPagina, offset]);

        res.render('prestamos/index', {
            prestamos,
            filtros: { estado, socio, fecha_desde, fecha_hasta },
            totalPaginas,
            paginaActual: pagina
        });

    } catch (error) {
        console.error('Error al filtrar y listar préstamos:', error);
        res.status(500).send('Error al obtener la lista de préstamos');
    }
};

// Vista para el formulario de nuevo préstamo
exports.formularioNuevoPrestamo = async (req, res) => {
    try {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [ejemplaresDisponibles] = await pool.query(`
            SELECT e.*, l.titulo AS titulo_libro 
            FROM ejemplar e 
            JOIN libro l ON e.id_libro = l.id_libro 
            WHERE e.estado = 'Disponible'
        `);
        res.render('prestamos/nuevo', { socios, ejemplaresDisponibles, error: null });
    } catch (error) {
        console.error('Error al cargar formulario de préstamo:', error);
        res.redirect('/prestamos');
    }
};

// Crear Préstamo
// Crear Préstamo con validación de estado activo y límite de 3 préstamos
// Crear Préstamo respetando la gestión independiente de Ejemplares y Estados
exports.crearPrestamo = async (req, res) => {
    const { id_socio, fecha_prestamo, fecha_vencimiento, ejemplares } = req.body;

    const recargarConError = async (mensajeError) => {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [ejemplaresDisponibles] = await pool.query(`
            SELECT e.*, l.titulo AS titulo_libro 
            FROM ejemplar e 
            JOIN libro l ON e.id_libro = l.id_libro 
            WHERE e.estado = 'Disponible'
        `);
        return res.render('prestamos/nuevo', { socios, ejemplaresDisponibles, error: mensajeError });
    };

    try {
        const fPrestamo = new Date(fecha_prestamo);
        const fVencimiento = new Date(fecha_vencimiento);

        // 1. Validar que la fecha de vencimiento no sea anterior a la fecha de préstamo
        if (fVencimiento < fPrestamo) {
            return await recargarConError('La fecha de vencimiento no puede ser anterior a la fecha de préstamo.');
        }

        // 2. Validar el plazo normal de 7 días corridos (máximo 7 días entre préstamo y vencimiento)
        const diferenciaTiempo = fVencimiento.getTime() - fPrestamo.getTime();
        const diferenciaDias = diferenciaTiempo / (1000 * 3600 * 24);

        if (diferenciaDias > 7) {
            return await recargarConError('El plazo máximo permitido para un préstamo es de 7 días corridos.');
        }

        if (diferenciaDias < 1) {
            return await recargarConError('El préstamo debe tener al menos un día de duración.');
        }

        // 3. Validar que se haya seleccionado al menos un ejemplar
        if (!ejemplares || (Array.isArray(ejemplares) && ejemplares.length === 0)) {
            return await recargarConError('Debe seleccionar al menos un ejemplar disponible.');
        }

        const idsEjemplares = Array.isArray(ejemplares) ? ejemplares : [ejemplares];

        // 4. VALIDACIÓN A: Verificar que el socio esté ACTIVO
        const [socioData] = await pool.query('SELECT estado FROM socio WHERE id_socio = ?', [id_socio]);
        if (socioData.length === 0 || socioData[0].estado !== 'Activo') {
            return await recargarConError('No se puede registrar un préstamo para un socio inactivo.');
        }

        // 5. VALIDACIÓN B: Verificar que el socio no supere los 3 préstamos activos
        const [prestamosActivos] = await pool.query(
            'SELECT COUNT(*) AS total FROM prestamo WHERE id_socio = ? AND estado = "Activo"',
            [id_socio]
        );
        if (prestamosActivos[0].total >= 3) {
            return await recargarConError('El socio ya posee el límite máximo de 3 préstamos activos.');
        }

        // 6. VALIDACIÓN C: Verificar que NINGUNO de los ejemplares esté ya en un préstamo activo
        for (let id_ej of idsEjemplares) {
            const [ejemplarOcupado] = await pool.query(`
                SELECT p.id_prestamo 
                FROM prestamo p
                JOIN detalle_prestamo dp ON p.id_prestamo = dp.id_prestamo
                WHERE dp.id_ejemplar = ? AND p.estado = 'Activo'
            `, [id_ej]);

            if (ejemplarOcupado.length > 0) {
                return await recargarConError(`El ejemplar con ID ${id_ej} ya se encuentra incluido en otro préstamo activo.`);
            }
        }

        // 7. Registrar la cabecera del préstamo
        const [resPrestamo] = await pool.query(
            'INSERT INTO prestamo (id_socio, fecha_prestamo, fecha_vencimiento, estado) VALUES (?, ?, ?, ?)',
            [id_socio, fecha_prestamo, fecha_vencimiento, 'Activo']
        );
        const id_prestamo = resPrestamo.insertId;

        // 8. Registrar detalle y actualizar estado del ejemplar a 'Prestado'
        for (let id_ej of idsEjemplares) {
            await pool.query(
                'INSERT INTO detalle_prestamo (id_prestamo, id_ejemplar) VALUES (?, ?)',
                [id_prestamo, id_ej]
            );
            await pool.query(
                'UPDATE ejemplar SET estado = "Prestado" WHERE id_ejemplar = ?',
                [id_ej]
            );
        }

        res.redirect('/prestamos');

    } catch (error) {
        console.error('ERROR AL CREAR PRESTAMO:', error);
        return await recargarConError('Ocurrió un error al registrar el préstamo: ' + (error.sqlMessage || error.message));
    }
};

// Devolver Préstamo
// Devolver Préstamo con cálculo de días de atraso, multas y múltiples ejemplares
exports.devolverPrestamo = async (req, res) => {
    const { id } = req.params; // id del préstamo
    const { nuevo_estado_ejemplar } = req.body; // 'Disponible', 'Dañado' o 'En mantenimiento'
    const fechaHoy = new Date().toISOString().split('T')[0];

    try {
        // 1. Validar que el préstamo exista y no esté ya devuelto
        const [prestamoData] = await pool.query('SELECT * FROM prestamo WHERE id_prestamo = ?', [id]);
        
        if (prestamoData.length === 0) {
            return res.redirect('/prestamos');
        }

        if (prestamoData[0].estado === 'Devuelto') {
            // Ya está devuelto, impedir segunda devolución por seguridad
            return res.redirect('/prestamos');
        }

        const fechaVencimiento = new Date(prestamoData[0].fecha_vencimiento);
        const fechaDevReal = new Date(fechaHoy);

        // 2. Calcular días de atraso (si la devolución es posterior al vencimiento)
        let diasAtraso = 0;
        const diferenciaMilisegundos = fechaDevReal - fechaVencimiento;
        if (diferenciaMilisegundos > 0) {
            diasAtraso = Math.ceil(diferenciaMilisegundos / (1000 * 3600 * 24));
        }

        // 3. Multa por ejemplar: $500 por cada día de atraso
        const multaPorEjemplar = diasAtraso * 500;

        // 4. Obtener todos los ejemplares asociados a este préstamo
        const [detalles] = await pool.query(
            'SELECT id_ejemplar FROM detalle_prestamo WHERE id_prestamo = ?',
            [id]
        );

        // 5. Actualizar los datos de atraso y multa en cada detalle del préstamo
        for (let det of detalles) {
            await pool.query(
                'UPDATE detalle_prestamo SET dias_atraso = ?, multa = ? WHERE id_prestamo = ? AND id_ejemplar = ?',
                [diasAtraso, multaPorEjemplar, id, det.id_ejemplar]
            );

            // Actualizar el estado del ejemplar (Disponible, Dañado o En Mantenimiento)
            const estadoFinalEjemplar = nuevo_estado_ejemplar || 'Disponible';
            await pool.query(
                'UPDATE ejemplar SET estado = ? WHERE id_ejemplar = ?',
                [estadoFinalEjemplar, det.id_ejemplar]
            );
        }

        // 6. Marcar el préstamo como Devuelto y registrar la fecha de devolución real
        await pool.query(
            'UPDATE prestamo SET estado = ?, fecha_devolucion = ? WHERE id_prestamo = ?',
            ['Devuelto', fechaHoy, id]
        );

        res.redirect('/prestamos');

    } catch (error) {
        console.error('Error al registrar la devolución:', error);
        res.redirect('/prestamos');
    }
};