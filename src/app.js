const express = require('express');
require('dotenv').config();

// Probar la conexión a la base de datos
require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar datos de formularios e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta de prueba inicial
app.get('/', (req, res) => {
    res.send('<h1>¡Servidor del Sistema de Biblioteca funcionando!</h1>');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});