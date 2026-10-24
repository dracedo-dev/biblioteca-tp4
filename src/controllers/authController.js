const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Renderizar formulario de Login
exports.getLogin = (req, res) => {
    // Si ya está autenticado, redirigir al Dashboard
    if (req.session.usuario) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
};

// Procesar inicio de sesión
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar usuario por email
        const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.render('login', { error: 'Credenciales inválidas' });
        }

        const usuario = rows[0];

        // 2. Verificar la contraseña encriptada
        const match = await bcrypt.compare(password, usuario.password);
        if (!match) {
            return res.render('login', { error: 'Credenciales inválidas' });
        }

        // 3. Guardar datos en la sesión
        req.session.usuario = {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error en postLogin:', error);
        res.render('login', { error: 'Error en el servidor al intentar iniciar sesión' });
    }
};

// Cerrar sesión
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

// Crear un usuario administrador inicial
exports.postRegistro = async (req, res) => {
    const { nombre, apellido, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuario (nombre, apellido, email, password) VALUES (?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword]
        );
        res.send('✅ Usuario creado correctamente. Volvé a <a href="/login">Login</a>');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar usuario: ' + error.message);
    }
};

// Renderizar vista de Registro
exports.getRegistro = (req, res) => {
    res.render('registro', { error: null });
};

// Procesar el registro e insertar en la base de datos con contraseña encriptada
exports.postRegistro = async (req, res) => {
    const { nombre, apellido, email, password } = req.body;

    try {
        // 1. Validar si el email ya existe en la base de datos
        const [usuarioExistente] = await pool.query(
            'SELECT * FROM usuario WHERE email = ?',
            [email.trim()]
        );

        if (usuarioExistente.length > 0) {
            return res.render('registro', {
                error: 'El correo electrónico ya se encuentra registrado.'
            });
        }

        // 2. Si no existe el email, encriptamos la contraseña e insertamos
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuario (nombre, apellido, email, password) VALUES (?, ?, ?, ?)',
            [nombre, apellido, email.trim(), hashedPassword]
        );

        // Podés redirigir al login o enviar el mensaje de éxito
        res.render('registro', { 
            error: null,
            mensajeExito: 'Usuario creado correctamente. Ya podés iniciar sesión.' 
        });

    } catch (error) {
        console.error(error);
        res.render('registro', {
            error: 'Ocurrió un error al registrar el usuario: ' + error.message
        });
    }
};