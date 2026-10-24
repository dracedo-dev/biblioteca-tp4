const pool = require('../config/db');

// Listar Socios (Buscador + Paginación)
exports.listarSocios = async (req, res) => {
    const buscar = req.query.buscar || '';
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 5;
    const offset = (pagina - 1) * limite;

    try {
        const [totalRows] = await pool.query(
            'SELECT COUNT(*) as total FROM socio WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ?',
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );
        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite) || 1;

        const [socios] = await pool.query(
            'SELECT * FROM socio WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? ORDER BY id_socio DESC LIMIT ? OFFSET ?',
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, limite, offset]
        );

        res.render('socios/index', {
            socios,
            buscar,
            paginaActual: pagina,
            totalPaginas,
            error: null
        });
    } catch (error) {
        console.error('Error al listar socios:', error);
        res.status(500).send('Error al obtener la lista de socios');
    }
};

// Crear Socio (No duplicados por DNI)
exports.crearSocio = async (req, res) => {
    const { nombre, apellido, dni, email, telefono } = req.body;

    try {
        const [existente] = await pool.query('SELECT * FROM socio WHERE dni = ?', [dni.trim()]);
        if (existente.length > 0) {
            const [socios] = await pool.query('SELECT * FROM socio ORDER BY id_socio DESC LIMIT 5');
            return res.render('socios/index', {
                socios,
                buscar: '',
                paginaActual: 1,
                totalPaginas: 1,
                error: 'Ya existe un socio registrado con ese número de DNI.'
            });
        }

        await pool.query(
            'INSERT INTO socio (nombre, apellido, dni, email, telefono) VALUES (?, ?, ?, ?, ?)',
            [nombre.trim(), apellido.trim(), dni.trim(), email ? email.trim() : null, telefono ? telefono.trim() : null]
        );
        res.redirect('/socios');
    } catch (error) {
        console.error('Error al crear socio:', error);
        res.redirect('/socios');
    }
};

// Renderizar formulario para nuevo socio
exports.formularioNuevoSocio = (req, res) => {
    res.render('socios/nuevo', { error: null });
};

// Guardar nuevo socio
exports.crearSocio = async (req, res) => {
    const { dni, nombre, apellido, email, telefono, direccion } = req.body;

    try {
        // Probamos insertando usando 'domicilio' en lugar de 'direccion'
        await pool.query(
            'INSERT INTO socio (dni, nombre, apellido, email, telefono, domicilio) VALUES (?, ?, ?, ?, ?, ?)',
            [dni, nombre, apellido, email, telefono, direccion]
        );
        res.redirect('/socios');
    } catch (error) {
        console.error('Error al crear socio:', error);

        // Si tampoco existe 'domicilio', probamos la consulta alternativa sin campo de direccion/domicilio
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            try {
                await pool.query(
                    'INSERT INTO socio (dni, nombre, apellido, email, telefono) VALUES (?, ?, ?, ?, ?)',
                    [dni, nombre, apellido, email, telefono]
                );
                return res.redirect('/socios');
            } catch (errInner) {
                console.error('Error secundario:', errInner);
            }
        }

        let mensajeError = 'Error al registrar el socio.';
        if (error.code === 'ER_DUP_ENTRY') {
            mensajeError = 'El DNI o Email ingresado ya pertenece a otro socio.';
        }

        res.render('socios/nuevo', { error: mensajeError });
    }
};

// Renderizar formulario para editar socio
exports.formularioEditarSocio = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM socio WHERE id_socio = ?', [id]);
        if (rows.length === 0) {
            return res.redirect('/socios');
        }
        res.render('socios/editar', { socio: rows[0], error: null });
    } catch (error) {
        console.error('Error al obtener socio:', error);
        res.redirect('/socios');
    }
};

// Estado del Socio (Activo/Inactivo)
exports.cambiarEstadoSocio = async (req, res) => {
    const { id } = req.params;
    try {
        // Consultar el estado actual del socio
        const [rows] = await pool.query('SELECT estado FROM socio WHERE id_socio = ?', [id]);
        if (rows.length === 0) return res.redirect('/socios');

        const estadoActual = rows[0].estado;
        const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

        // Actualizar al nuevo estado
        await pool.query('UPDATE socio SET estado = ? WHERE id_socio = ?', [nuevoEstado, id]);

        res.redirect('/socios');
    } catch (error) {
        console.error('Error al cambiar estado del socio:', error);
        res.redirect('/socios');
    }
};

// Actualizar socio
exports.actualizarSocio = async (req, res) => {
    const { id } = req.params;
    const { dni, nombre, apellido, email, telefono, direccion } = req.body;

    try {
        await pool.query(
            'UPDATE socio SET dni = ?, nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id_socio = ?',
            [dni, nombre, apellido, email, telefono, id]
        );
        res.redirect('/socios');
    } catch (error) {
        console.error('Error al actualizar socio:', error);
        res.render('socios/editar', { socio: { id_socio: id, dni, nombre, apellido, email, telefono, direccion }, error: 'Error al actualizar datos' });
    }
};

// Eliminar socio
exports.eliminarSocio = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM socio WHERE id_socio = ?', [id]);
        res.redirect('/socios');
    } catch (error) {
        console.error('Error al eliminar socio:', error);
        res.redirect('/socios');
    }
};