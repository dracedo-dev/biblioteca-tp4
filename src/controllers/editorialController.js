const pool = require('../config/db');

// Listado con Buscador y Paginación
exports.listarEditoriales = async (req, res) => {
    const buscar = req.query.buscar || '';
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 5; // Cantidad de elementos por página
    const offset = (pagina - 1) * limite;

    try {
        // Consulta para contar total de registros filtrados
        const [totalRows] = await pool.query(
            'SELECT COUNT(*) as total FROM editorial WHERE nombre LIKE ?',
            [`%${buscar}%`]
        );
        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite) || 1;

        // Consulta de registros paginados
        const [editoriales] = await pool.query(
            'SELECT * FROM editorial WHERE nombre LIKE ? ORDER BY id_editorial DESC LIMIT ? OFFSET ?',
            [`%${buscar}%`, limite, offset]
        );

        res.render('editoriales/index', {
            editoriales,
            buscar,
            paginaActual: pagina,
            totalPaginas,
            error: null
        });
    } catch (error) {
        console.error('Error al listar editoriales:', error);
        res.status(500).send('Error al cargar editoriales');
    }
};

// Crear editorial con validación de NO duplicados
exports.crearEditorial = async (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.redirect('/editoriales');
    }

    try {
        // Verificar duplicados (insensible a mayúsculas/minúsculas)
        const [existente] = await pool.query(
            'SELECT * FROM editorial WHERE LOWER(nombre) = LOWER(?)',
            [nombre.trim()]
        );

        if (existente.length > 0) {
            // Si ya existe, podemos recargar con mensaje o redirigir
            const [editoriales] = await pool.query('SELECT * FROM editorial ORDER BY id_editorial DESC LIMIT 5');
            return res.render('editoriales/index', {
                editoriales,
                buscar: '',
                paginaActual: 1,
                totalPaginas: 1,
                error: 'La editorial ya existe en la base de datos.'
            });
        }

        await pool.query('INSERT INTO editorial (nombre) VALUES (?)', [nombre.trim()]);
        res.redirect('/editoriales');
    } catch (error) {
        console.error('Error al crear editorial:', error);
        res.redirect('/editoriales');
    }
};

// Vista Editar
exports.formularioEditar = async (req, res) => {
    const { id } = req.params;
    try {
        const [editoriales] = await pool.query('SELECT * FROM editorial WHERE id_editorial = ?', [id]);
        if (editoriales.length === 0) return res.redirect('/editoriales');
        res.render('editoriales/editar', { editorial: editoriales[0], error: null });
    } catch (error) {
        res.redirect('/editoriales');
    }
};

// Editar editorial con validación de NO duplicados
exports.actualizarEditorial = async (req, res) => {
    const { id } = req.params;
    const { nombre } = req.body;

    try {
        const [existente] = await pool.query(
            'SELECT * FROM editorial WHERE LOWER(nombre) = LOWER(?) AND id_editorial != ?',
            [nombre.trim(), id]
        );

        if (existente.length > 0) {
            return res.render('editoriales/editar', {
                editorial: { id_editorial: id, nombre },
                error: 'Ya existe otra editorial con ese nombre.'
            });
        }

        await pool.query('UPDATE editorial SET nombre = ? WHERE id_editorial = ?', [nombre.trim(), id]);
        res.redirect('/editoriales');
    } catch (error) {
        res.redirect('/editoriales');
    }
};

// Eliminar editorial
exports.eliminarEditorial = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM editorial WHERE id_editorial = ?', [id]);
        res.redirect('/editoriales');
    } catch (error) {
        console.error('Error al eliminar editorial:', error);
        res.redirect('/editoriales');
    }
};