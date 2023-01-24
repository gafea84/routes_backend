const router = require('express').Router();

const { checkSchema } = require('express-validator');
const { manageRouterError } = require('../../../helpers/router_utils');
const { checkRole } = require('../../../helpers/token_utils');
const { ramaValidationSchema } = require('../../../helpers/validators/ramas.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { adminRoleDescription } = require('../../../models/roles.model');
const { create, update, remove } = require('../../../models/ramas.model');
const { getByRamaId } = require('../../../models/profesores.model');
const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { success } = require('../../../helpers/success_utils');

// Dar de alta una rama.
// (Solo lo podrá hacer un administrador)
router.post(
    '/',
    checkRole(adminRoleDescription),
    checkSchema(ramaValidationSchema),
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = (await create(req.body)).insertId;

            res.json({id, ...req.body});
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Modificar una rama.
// (Solo lo podrá hacer un administrador)
router.put(
    '/:id',
    checkRole(adminRoleDescription),    
    checkSchema(ramaValidationSchema),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            const result = await update(id, req.body);
            if(result.affectedRows == 0){
                res.status(404)
                   .json({ messageError: 'No existe la rama especificada' });
            }
            else {
                res.json({id, ...req.body});
            }            
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Borrado de una rama.
// (Solo lo podrá hacer un administrador, y si la rama no está asociada a algún profesor)
router.delete(
    '/:id',
    checkRole(adminRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const id = req.params.id;

            const profesor = await getByRamaId(id);
            if (profesor !== null){
                return res.status(409)
                          .json({ messageError: 'No es posible borrar: la rama está ligada a algún profesor' });
            }

            const result = await remove(id);
            if(result.affectedRows === 0){
                return res.status(404)
                          .json({ messageError: 'No existe la rama especificada' });
            }
            else {
                return res.json(success);
            }            
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

module.exports = router;