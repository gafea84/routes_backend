const router = require('express').Router();
const bcrypt = require('bcrypt');
const { checkSchema } = require('express-validator');

const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { logicDelete, logicUndelete, search, searchByTeacherId, searchFields, getByUserId } = require('../../../models/alumnos.model');
const { manageRouterError } = require('../../../helpers/router_utils');
const { getAlumnoValidationSchema } = require('../../../helpers/validators/alumnos.validator');
const { checkRole, checkRoles } = require('../../../helpers/token_utils');
const { success } = require('../../../helpers/success_utils');
const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { alumnoRoleDescription, adminRoleDescription, profesorRoleDescription } = require('../../../models/roles.model');
const { updateUserFields } = require('../updateUserFields');
const { pageLimitValidationSchema } = require('../../../helpers/validators/pagelimit.validator');
const { searchValidationSchema } = require('../../../helpers/validators/search.validator');
const { formatSearchResult } = require('../../../helpers/searchUtils/searchresult_utils');
const { getByUserId: getProfesorByUserId } = require('../../../models/profesores.model');

// Actualización de los datos de un alumno (menos el password).
// (Solo lo podrá hacer él mismo)
router.put(
    '/update/',
    checkRole(alumnoRoleDescription),
    checkSchema(getAlumnoValidationSchema(false)),
    checkValidationsResult,
    (req, res) => updateUserFields(req, res, () => {}) // Pasamos una función que no hace nada(solo hay que actualizar campos de la tabla usuarios
);

// Borrado lógico del usuario.
// (Solo lo podrá hacer un administrador)
router.delete(
    '/delete/:id',
    checkRole(adminRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;
            
            const result = await logicDelete(id);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el alumno especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Borrado lógico del usuario.
// (Solo lo podrá hacer un administrador)
router.put(
    '/undelete/:id',
    checkRole(adminRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;
            
            const result = await logicUndelete(id);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el alumno especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Recuperamos los alumnos (de manera paginada - opcional-, con filtros y group by - opcional -).
// (Solo lo podrá hacer un administrador - se muestran todos los alumnos -, o un profesor
// - se muestras solo sus alumnos y si no están borrados -),
router.post(
    '/getSearch', 
    checkRoles([adminRoleDescription, profesorRoleDescription]),
    checkSchema(searchValidationSchema(searchFields)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            let alumnos;
            if (req.user.role === adminRoleDescription) {
                alumnos = await search(req.body, page, limit);
            } else {
                const profesor = await getProfesorByUserId(req.user.id);
                if (profesor === null) {
                    return res.status(404)
                              .json({ messageError: 'No existe el profesor especificado en el token' });
                }
                alumnos = await searchByTeacherId(req.body, profesor.id, page, limit);
            }
            
            res.json(formatSearchResult(alumnos));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

module.exports = router;