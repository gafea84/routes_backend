const { checkSchema } = require('express-validator');
const { manageRouterError } = require('../../../helpers/router_utils');
const { success } = require('../../../helpers/success_utils');
const { checkRole, checkRoles } = require('../../../helpers/token_utils');
const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { validate, getByUserId, updateConfigurationFieldsTrans, search, searchByAlumnoId, searchFields, lock } = require('../../../models/profesores.model');
const { getByUserId: getAlumnoByUserId } = require('../../../models/alumnos.model');
const { adminRoleDescription, profesorRoleDescription, alumnoRoleDescription } = require('../../../models/roles.model');
const { getProfesorValidationSchema } = require('../../../helpers/validators/profesores.validator');
const { updateUserFields } = require('../updateUserFields');
const { searchValidationSchema } = require('../../../helpers/validators/search.validator');
const { pageLimitValidationSchema } = require('../../../helpers/validators/pagelimit.validator');
const { formatSearchResult } = require('../../../helpers/searchUtils/searchresult_utils');

const router = require('express').Router();

// Validación de un profesor.
// (Solo lo podrá hacer un administrador)
router.put(
    '/validate/:id',
    checkRole(adminRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            const result = await validate(id);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el profesor especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Bloqueo de un profesor. (Pasa a estar sin validar)
// (Solo lo podrá hacer un administrador)
router.put(
    '/lock/:id',
    checkRole(adminRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            const result = await lock(id);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe el profesor especificado' });
            }
            else {
                res.json(success);
            }
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Actualización de los datos de un profesor (menos el password).
// (Solo lo podrá hacer él mismo)
router.put(
    '/update/',
    checkRole(profesorRoleDescription),
    checkSchema(getProfesorValidationSchema(false)),
    checkValidationsResult,
    async (req, res) => {
        try {
            const usuarioId = req.user.id;
            const profesor  = await getByUserId(usuarioId);
            if (profesor === null) {
                return res.status(404)
                          .json({ messageError: 'No existe el profesor especificado' });
            }

            req.body.id = profesor.id;            

            updateUserFields(req, res, updateConfigurationFieldsTrans);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Recuperamos los profesores (de manera paginada - opcional-, con filtros y group by - opcional -).
// (Solo lo podrá hacer un administrador - se muestran todos los presores -, o un alumno
// - se muestras solo sus profesores y si están activados -),
router.post(
    '/getSearch', 
    checkRoles([adminRoleDescription, alumnoRoleDescription]),
    checkSchema(searchValidationSchema(searchFields)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            let profesores;
            if (req.user.role === adminRoleDescription) {
                profesores = await search(req.body, page, limit);
            } else {
                const alumno = await getAlumnoByUserId(req.user.id);
                if (alumno === null) {
                    return res.status(404)
                              .json({ messageError: 'No existe el alumno especificado en el token' });
                }
                profesores = await searchByAlumnoId(req.body, alumno.id, page, limit);
            }
            
            res.json(formatSearchResult(profesores));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

module.exports = router;