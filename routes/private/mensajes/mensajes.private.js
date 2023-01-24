const router = require('express').Router();

const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { checkSchema } = require('express-validator');
const { manageRouterError } = require('../../../helpers/router_utils');
const { success } = require('../../../helpers/success_utils');
const { checkRoles } = require('../../../helpers/token_utils');
const { mensajeValidationSchema } = require('../../../helpers/validators/mensaje.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { getByUserId: getAlumnoByUserId, getCompleteAlumnoByUserId } = require('../../../models/alumnos.model');
const { create, getMensajes, setLeido, deleteMensajeAlumno, deleteMensajeProfesor } = require('../../../models/mensajes.model');
const { getByUserId: getProfesorByUserId, getCompleteProfesorByUserId } = require('../../../models/profesores.model');
const { profesorRoleDescription, alumnoRoleDescription } = require('../../../models/roles.model');
const { nuevoMensaje } = require('../../../helpers/socketio_utils');

// Enviar un mensaje.
// (Solo lo podrá hacer un alumno o un profesor)
router.post(
    '/send',
    checkRoles([alumnoRoleDescription, profesorRoleDescription]),
    checkSchema(mensajeValidationSchema),
    checkValidationsResult,
    async (req, res) => {
        try {
            let alumnoUserId, profesorUserId;            
            if (req.user.role === alumnoRoleDescription) {                
                // El que envía es un alumno.
                alumnoUserId   = req.user.id;
                profesorUserId = req.body.idUsuarioDestino;
            } else {                
                // El que envía es un profesor.
                alumnoUserId   = req.body.idUsuarioDestino;
                profesorUserId = req.user.id;
            }

            const alumno = await getCompleteAlumnoByUserId(alumnoUserId);
            if ((alumno === null) || (alumno.borrado)) {
                return res.status(404)
                          .json({ messageError: 'No existe el alumno especificado' });
            }

            const profesor = await getCompleteProfesorByUserId(profesorUserId);
            if ((profesor === null) || (!profesor.validado)) {
                return res.status(404)
                          .json({ messageError: 'No existe el profesor especificado' });
            }

            let autor, destinatario, autorObj;
            if (req.user.role === alumnoRoleDescription) {                
                // El que envía es un alumno.
                autorObj     = alumno;
                autor        = alumno.id;
                destinatario = profesor.id;
            } else {                
                // El que envía es un profesor.
                autorObj     = profesor;
                autor        = profesor.id;
                destinatario = alumno.id;
            }

            const mensaje = await create(profesor.id, alumno.id, autor, destinatario, req.body.texto);

            nuevoMensaje(req.body.idUsuarioDestino, mensaje, autorObj);

            res.json(mensaje);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Recuperar mensajes.
// (Solo lo podrá hacer un alumno o un profesor)
router.get(
    '/allmessages',
    checkRoles([alumnoRoleDescription, profesorRoleDescription]),
    async (req, res) => {
        try {
            let profesorId, alumnoId;
            if (req.user.role === alumnoRoleDescription) {                
                // Mensajes de un alumno.
                const alumno = await getAlumnoByUserId(req.user.id);
                if ((alumno === null) || (alumno.borrado)) {                    
                    return res.status(404)
                              .json({ messageError: 'No existe el alumno especificado' });
                }
                profesorId = null;
                alumnoId   = alumno.id;
            } else {                
                // Mensajes de un profesor.
                const profesor = await getProfesorByUserId(req.user.id);
                if ((profesor === null) || (!profesor.validado)) {
                    return res.status(404)
                              .json({ messageError: 'No existe el profesor especificado' });
                }
                profesorId = profesor.id;
                alumnoId   = null;
            }

            const conversaciones = await getMensajes(profesorId, alumnoId);

            res.json(conversaciones);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Marcar mensaje como leído.
// (Sólo lo podrá hacer un alumno o un profesor)
router.put(
    '/setread/:id',
    checkRoles([alumnoRoleDescription, profesorRoleDescription]),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            let destinatario;
            if (req.user.role === alumnoRoleDescription) {                
                // Mensaje para un alumno.
                const alumno = await getAlumnoByUserId(req.user.id);
                if ((alumno === null) || (alumno.borrado)) {                    
                    return res.status(404)
                              .json({ messageError: 'No existe el alumno especificado' });
                }
                destinatario = alumno.id;
            } else {                
                // Mensaje para un profesor.
                const profesor = await getProfesorByUserId(req.user.id);
                if ((profesor === null) || (!profesor.validado)) {
                    return res.status(404)
                              .json({ messageError: 'No existe el profesor especificado' });
                }
                destinatario = profesor.id;
            }
            
            const result = await setLeido(id, destinatario);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el mensaje especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Marcar mensaje como borrado para él mismo (el otro interlocutor lo podrá seguir viendolo si no lo borra).
// (Sólo lo podrá hacer un alumno o un profesor)
router.delete(
    '/delete/:id',
    checkRoles([alumnoRoleDescription, profesorRoleDescription]),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            let result;
            if (req.user.role === alumnoRoleDescription) {                
                // Conversación del alumno.
                const alumno = await getAlumnoByUserId(req.user.id);
                if ((alumno === null) || (alumno.borrado)) {                    
                    return res.status(404)
                              .json({ messageError: 'No existe el alumno especificado' });
                }
                
                result = await deleteMensajeAlumno(id, alumno.id);
            } else {                
                // Conversación del profesor.
                const profesor = await getProfesorByUserId(req.user.id);
                if ((profesor === null) || (!profesor.validado)) {
                    return res.status(404)
                              .json({ messageError: 'No existe el profesor especificado' });
                }

                result = await deleteMensajeProfesor(id, profesor.id);
            }
            
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el mensaje especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

module.exports = router;