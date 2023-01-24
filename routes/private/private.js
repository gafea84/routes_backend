const router = require('express').Router();

router.use('/alumnos',  require('./alumnos/alumnos.private'));
router.use('/usuarios',  require('./usuarios/usuarios.private'));
router.use('/profesores',  require('./profesores/profesores.private'));
router.use('/inscripciones',  require('./inscripciones/inscripciones.private'));
router.use('/ramas',  require('./ramas/ramas.private'));
router.use('/mensajes',  require('./mensajes/mensajes.private'));
router.use('/conversaciones',  require('./conversaciones/conversaciones.private'));

module.exports = router;