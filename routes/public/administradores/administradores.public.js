const router = require('express').Router();

/*
const { checkSchema } = require('express-validator');
const { loginValidationSchema } = require('../../../helpers/validators/login.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { getByEmailWithPassword } = require('../../../models/administradores.model');
const { commonLogin } = require('../login_utils');

// Login de un administrador.
router.post(
    '/login', 
    checkSchema(loginValidationSchema),
    checkValidationsResult,
    async (req, res) => {
        commonLogin(req, res, getByEmailWithPassword, 'administrador');
    }
);

*/

module.exports = router;