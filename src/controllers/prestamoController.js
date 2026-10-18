const pool = require('../config/db');

// Listar préstamos
exports.listarPrestamos = async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   s.nombre AS socio_nombre, s.apellido AS socio_apellido, s.dni AS socio_dni
            FROM prestamo p
            JOIN socio s ON p.id_socio = s.id_socio
            ORDER BY p.id_prestamo DESC
        `;
        const [prestamos] = await pool.query(query);
        res.render('prestamos/index', { prestamos, error: null });
    } catch (error) {
        console.error('Error al listar préstamos:', error);
        res.status(500).send('Error al obtener la lista de préstamos');
    }
};

// Formulario para nuevo préstamo
exports.formularioNuevoPrestamo = async (req, res) => {
    try {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        
        res.render('prestamos/nuevo', { socios, libros, error: null });
    } catch (error) {
        console.error('Error al cargar datos para préstamo:', error);
        res.redirect('/prestamos');
    }
};

// Crear nuevo préstamo
exports.crearPrestamo = async (req, res) => {
    const { id_socio, fecha_prestamo, fecha_devolucion_esperada } = req.body;

    if (!id_socio || !fecha_prestamo || !fecha_devolucion_esperada) {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        return res.render('prestamos/nuevo', { 
            socios, 
            libros, 
            error: 'Todos los campos marcados son obligatorios.' 
        });
    }

    try {
        // Guardamos el estado con 'Activo' acorde al ENUM de la BD
        await pool.query(
            'INSERT INTO prestamo (id_socio, fecha_prestamo, fecha_vencimiento, estado) VALUES (?, ?, ?, ?)',
            [id_socio, fecha_prestamo, fecha_devolucion_esperada, 'Activo']
        );
        res.redirect('/prestamos');
    } catch (error) {
        console.error('Error al crear préstamo:', error);
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY apellido, nombre ASC');
        const [libros] = await pool.query('SELECT * FROM libro ORDER BY titulo ASC');
        
        res.render('prestamos/nuevo', { 
            socios, 
            libros, 
            error: 'Error al registrar el préstamo en la base de datos.' 
        });
    }
};

// Marcar préstamo como Devuelto
exports.devolverPrestamo = async (req, res) => {
    const { id } = req.params;
    const fechaHoy = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            'UPDATE prestamo SET fecha_devolucion = ?, estado = ? WHERE id_prestamo = ?',
            [fechaHoy, 'Devuelto', id]
        );
        res.redirect('/prestamos');
    } catch (error) {
        console.error('Error al devolver préstamo:', error);
        res.redirect('/prestamos');
    }
};