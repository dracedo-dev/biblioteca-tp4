const pool = require('../config/db');

// Listar todos los socios
exports.listarSocios = async (req, res) => {
    try {
        const [socios] = await pool.query('SELECT * FROM socio ORDER BY id_socio DESC');
        res.render('socios/index', { socios, error: null });
    } catch (error) {
        console.error('Error al listar socios:', error);
        res.status(500).send('Error al obtener la lista de socios');
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