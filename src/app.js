const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

const socioRoutes = require('./routes/socioRoutes');
const libroRoutes = require('./routes/libroRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const autorRoutes = require('./routes/autorRoutes');
const editorialRoutes = require('./routes/editorialRoutes');

// Configuración de Vistas (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

// Pasar el usuario logueado a todas las vistas EJS
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Rutas Públicas de Autenticación 
app.use('/', authRoutes);

// Rutas Protegidas
app.use('/socios', socioRoutes);
app.use('/libros', libroRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/autores', autorRoutes);
app.use('/editoriales', editorialRoutes);

// Ruta Protegida: Dashboard
app.get('/dashboard', authMiddleware, (req, res) => {
    res.render('dashboard');
});

// Redirección inicial
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
