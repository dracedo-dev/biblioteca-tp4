const pool = require('../config/db');

// Listar Libros (Buscador + Paginación)
exports.listarLibros = async (req, res) => {
    const buscar = req.query.buscar || '';
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = 5;
    const offset = (pagina - 1) * limite;

    try {
        const [totalRows] = await pool.query(
            'SELECT COUNT(*) as total FROM libro WHERE titulo LIKE ?',
            [`%${buscar}%`]
        );
        const totalRegistros = totalRows[0].total;
        const totalPaginas = Math.ceil(totalRegistros / limite) || 1;

        const query = `
            SELECT l.*, c.nombre AS categoria_nombre, a.nombre AS autor_nombre, a.apellido AS autor_apellido, e.nombre AS editorial_nombre
            FROM libro l
            LEFT JOIN categoria c ON l.id_categoria = c.id_categoria
            LEFT JOIN autor a ON l.id_autor = a.id_autor
            LEFT JOIN editorial e ON l.id_editorial = e.id_editorial
            WHERE l.titulo LIKE ?
            ORDER BY l.id_libro DESC LIMIT ? OFFSET ?
        `;
        const [libros] = await pool.query(query, [`%${buscar}%`, limite, offset]);

        res.render('libros/index', {
            libros,
            buscar,
            paginaActual: pagina,
            totalPaginas,
            error: null
        });
    } catch (error) {
        console.error('Error al listar libros:', error);
        res.status(500).send('Error al cargar libros');
    }
};

// Crear Libro + Generar Ejemplares Automáticos
exports.crearLibro = async (req, res) => {
    const { isbn, titulo, id_categoria, id_autor, id_editorial, anio_publicacion, cantidad_ejemplares } = req.body;
    const copias = parseInt(cantidad_ejemplares) || 1;

    try {
        // 1. Validar si ya existe un libro con el mismo ISBN o Título
        const [existente] = await pool.query(
            'SELECT * FROM libro WHERE isbn = ? OR LOWER(titulo) = LOWER(?)',
            [isbn.trim(), titulo.trim()]
        );

        if (existente.length > 0) {
            const [categorias] = await pool.query('SELECT * FROM categoria');
            const [autores] = await pool.query('SELECT * FROM autor');
            const [editoriales] = await pool.query('SELECT * FROM editorial');
            return res.render('libros/nuevo', {
                categorias, autores, editoriales,
                error: 'Ya existe un libro registrado con ese ISBN o título.'
            });
        }

        // 2. Insertar el libro guardando el ISBN
        const [resLibro] = await pool.query(
            'INSERT INTO libro (isbn, titulo, id_categoria, id_autor, id_editorial, anio_publicacion) VALUES (?, ?, ?, ?, ?, ?)',
            [isbn.trim(), titulo.trim(), id_categoria, id_autor, id_editorial, anio_publicacion]
        );

        const id_libro = resLibro.insertId;

        // 3. Crear los N ejemplares en la tabla ejemplar
        for (let i = 1; i <= copias; i++) {
            const codigoInventario = `INV-${id_libro}-${i.toString().padStart(3, '0')}`;
            await pool.query(
                'INSERT INTO ejemplar (codigo_inventario, estado, id_libro) VALUES (?, ?, ?)',
                [codigoInventario, 'Disponible', id_libro]
            );
        }

        res.redirect('/libros');
    } catch (error) {
        console.error('Error al crear libro:', error);
        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');
        res.render('libros/nuevo', {
            categorias, autores, editoriales,
            error: 'Error al registrar el libro. Verificá que el ISBN no esté repetido.'
        });
    }
};

// Formulario para nuevo libro
exports.formularioNuevoLibro = async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');
        
        res.render('libros/nuevo', { categorias, autores, editoriales, error: null });
    } catch (error) {
        console.error('Error al cargar datos para nuevo libro:', error);
        res.redirect('/libros');
    }
};

// Crear libro
exports.crearLibro = async (req, res) => {
    const { titulo, isbn, anio_publicacion, id_categoria, id_autor, id_editorial } = req.body;

    try {
        // Validar que el año no sea superior al año actual
        const anioActual = new Date().getFullYear();
        if (parseInt(anio_publicacion) > anioActual) {
            const [categorias] = await pool.query('SELECT * FROM categoria');
            const [autores] = await pool.query('SELECT * FROM autor');
            const [editoriales] = await pool.query('SELECT * FROM editorial');

            return res.render('libros/nuevo', {
                categorias,
                autores,
                editoriales,
                error: `El año de publicación no puede ser superior al año actual (${anioActual}).`
            });
        }

        await pool.query(
            'INSERT INTO libro (titulo, isbn, anio_publicacion, id_categoria, id_autor, id_editorial) VALUES (?, ?, ?, ?, ?, ?)',
            [titulo, isbn, anio_publicacion, id_categoria || null, id_autor || null, id_editorial || null]
        );
        res.redirect('/libros');
    } catch (error) {
        console.error('Error al crear libro:', error);

        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');

        res.render('libros/nuevo', {
            categorias,
            autores,
            editoriales,
            error: 'Error al registrar el libro. Verificá que el ISBN no esté repetido.'
        });
    }
};

// Renderizar formulario de edición de libro
exports.getEditarLibro = async (req, res) => {
    const { id } = req.params;
    try {
        const [libros] = await pool.query('SELECT * FROM libro WHERE id_libro = ?', [id]);
        if (libros.length === 0) return res.redirect('/libros');

        const [categorias] = await pool.query('SELECT * FROM categoria');
        const [autores] = await pool.query('SELECT * FROM autor');
        const [editoriales] = await pool.query('SELECT * FROM editorial');

        res.render('libros/editar', {
            libro: libros[0],
            categorias,
            autores,
            editoriales,
            error: null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/libros');
    }
};

// Procesar actualización de libro
exports.postEditarLibro = async (req, res) => {
    const { id } = req.params;
    const { isbn, titulo, id_categoria, id_autor, id_editorial, anio_publicacion } = req.body;

    try {
        // Validar que el año no sea superior al año actual
        const anioActual = new Date().getFullYear();
        if (parseInt(anio_publicacion) > anioActual) {
            const [categorias] = await pool.query('SELECT * FROM categoria');
            const [autores] = await pool.query('SELECT * FROM autor');
            const [editoriales] = await pool.query('SELECT * FROM editorial');

            return res.render('libros/editar', {
                libro: { id_libro: id, isbn, titulo, id_categoria, id_autor, id_editorial, anio_publicacion },
                categorias,
                autores,
                editoriales,
                error: `El año de publicación no puede ser superior al año actual (${anioActual}).`
            });
        }

        // Validar que el ISBN o Título no pertenezcan a OTRO libro diferente
        const [existente] = await pool.query(
            'SELECT * FROM libro WHERE (isbn = ? OR LOWER(titulo) = LOWER(?)) AND id_libro != ?',
            [isbn.trim(), titulo.trim(), id]
        );

        if (existente.length > 0) {
            const [categorias] = await pool.query('SELECT * FROM categoria');
            const [autores] = await pool.query('SELECT * FROM autor');
            const [editoriales] = await pool.query('SELECT * FROM editorial');

            return res.render('libros/editar', {
                libro: { id_libro: id, isbn, titulo, id_categoria, id_autor, id_editorial, anio_publicacion },
                categorias,
                autores,
                editoriales,
                error: 'Ya existe otro libro con ese mismo ISBN o título.'
            });
        }

        await pool.query(
            'UPDATE libro SET isbn = ?, titulo = ?, id_categoria = ?, id_autor = ?, id_editorial = ?, anio_publicacion = ? WHERE id_libro = ?',
            [isbn.trim(), titulo.trim(), id_categoria, id_autor, id_editorial, anio_publicacion, id]
        );

        res.redirect('/libros');
    } catch (error) {
        console.error(error);
        res.redirect('/libros');
    }
};

// Eliminar libro
exports.eliminarLibro = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM libro WHERE id_libro = ?', [id]);
        res.redirect('/libros');
    } catch (error) {
        console.error('Error al eliminar libro:', error);
        res.redirect('/libros');
    }
};