module.exports = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next(); // Usuario autenticado, continúa
    }
    res.redirect('/login'); // No autenticado, redirigir
};