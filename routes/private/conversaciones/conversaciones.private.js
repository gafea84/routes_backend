const router = require('express').Router();

const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { checkSchema } = require('express-validator');
const { manageRouterError } = require('../../../helpers/router_utils');
const { success } = require('../../../helpers/success_utils');
const { checkRoles } = require('../../../helpers/token_utils');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { getByUserId: getAlumnoByUserId } = require('../../../models/alumnos.model');
const { getByUserId: getProfesorByUserId } = require('../../../models/profesores.model');
const { deleteConversacionAlumno, deleteConversacionProfesor } = require('../../../models/mensajes.model');
const { profesorRoleDescription, alumnoRoleDescription } = require('../../../models/roles.model');

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
                
                result = await deleteConversacionAlumno(id, alumno.id);
            } else {                
                // Conversación del profesor.
                const profesor = await getProfesorByUserId(req.user.id);
                if ((profesor === null) || (!profesor.validado)) {
                    return res.status(404)
                              .json({ messageError: 'No existe el profesor especificado' });
                }

                result = await deleteConversacionProfesor(id, profesor.id);
            }
            
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe la conversación especificada' });
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