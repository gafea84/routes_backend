const router = require('express').Router();

router.use('/login',  require('./login/login.public'));
router.use('/profesores',  require('./profesores/profesores.public'));
router.use('/alumnos',  require('./alumnos/alumnos.public'));
router.use('/administradores',  require('./administradores/administradores.public'));
router.use('/ramas',  require('./ramas/ramas.public'));
router.use('/usuarios',  require('./usuarios/usuarios.public'));

module.exports = router;