const router = require('express').Router();

const bcrypt = require('bcrypt');
const { manageRouterError, manageRouterErrorPasswordHTML } = require('../../../helpers/router_utils');
const { checkSchema, param } = require('express-validator');
const { emailValidationSchema } = require('../../../helpers/validators/email.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { success } = require('../../../helpers/success_utils');
const { create, EmailTypes } = require('../../../models/emailspendientes.model');
const { getByEmail, updatePassword } = require('../../../models/usuarios.model');
const { sendMailDataLoaded } = require('../../../helpers/email/email_from_model');
const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { validateTokenStr } = require('../../../helpers/token_utils');
const { getNewPasswordHtml } = require('../../../helpers/handlebars_templates/new_password.template');
const { getErrorPasswordHtml } = require("../../../helpers/handlebars_templates/error_password.template");
const { regeneratePasswordSchema } = require('../../../helpers/validators/regeneratepassword.validator');

// Petición de cambio de password de usuario 
// (envía el correo).
router.post(
    '/newpassword', 
    checkSchema(emailValidationSchema),
    checkValidationsResult,
    async (req, res) => {
        try {
            const emailEnabled = ((process.env.EMAIL_ENABLED) && (process.env.EMAIL_ENABLED !== '0'));
            if (!emailEnabled) {
                return res.status(503)
                          .json({ errorMessage: 'No está configurado el envío de correos electrónicos en el servidor' })
            }

            const { email } = req.body;
            
            const user = await getByEmail(email);
            if (!user) {
                return res.status(401)
                          .json({ errorMessage: 'El email no es correcto' })
            }

            const emailId = (await create(EmailTypes.NUEVO_PASSWORD, user.id)).insertId;

            res.json(success);

            // No esperamos la resolución de la promesa, ni tratamos el error aquí
            // (quedaría anotado en la tabla que está pendiente, y el proceso encargado
            //  de enviar los pendientes lo hará cuando pueda).
            sendMailDataLoaded(
                emailId,
                EmailTypes.NUEVO_PASSWORD,
                user
            )
            .then()
            .catch();
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Devuelve HTML, la página del cambio del password está en el back.
router.get(
    '/passwordform/:id/:token',
    idParamValidator,
    param('token').exists(),
    checkValidationsResult,
    async (req, res) => {
        try {
            const token = req.params.token;
            const id    = req.params.id;

            const validationResult = await validateTokenStr(token);
            if (!validationResult.ok) {
                return res.send(
                            getErrorPasswordHtml({ errorTxt: validationResult.message, url: process.env.FRONT_LOGIN_URL })
                       );
            }

            if (validationResult.user.id != id) { // Ponemos != en lugar de !== porque uno es cadena y el otro número.
                return res.send(
                            getErrorPasswordHtml({ errorTxt: 'Identificador incorrecto', url: process.env.FRONT_LOGIN_URL })
                       );
            }

            const url = process.env.BASE_URL + '/api/public/usuarios/savenewpassword';

            res.send(
                getNewPasswordHtml({ id, token, url })
            );
        } catch (error) {
            res.send(
                getErrorPasswordHtml({ errorTxt: error.message, url: process.env.FRONT_LOGIN_URL })
            );
        }
    }
);

// Devuelve HTML, la página del cambio del password está en el back.
router.post(
    '/savenewpassword',
    checkSchema(regeneratePasswordSchema),
    checkValidationsResult,
    async(req, res) => {
        try {            
            const { token, id, password } = req.body;

            const validationResult = await validateTokenStr(token);
            if (!validationResult.ok) {
                return res.send(
                            getErrorPasswordHtml({ errorTxt: validationResult.message, url: process.env.FRONT_LOGIN_URL })
                       );
            }

            if (validationResult.user.id != id) { // Ponemos != en lugar de !== porque uno es cadena y el otro número.
                return res.send(
                            getErrorPasswordHtml({ errorTxt: 'Identificador incorrecto', url: process.env.FRONT_LOGIN_URL })
                       );
            }

            await updatePassword(id, bcrypt.hashSync(req.body.password, 8));

            res.redirect(process.env.FRONT_LOGIN_URL);
        } catch (error) {
            res.send(
                getErrorPasswordHtml({ errorTxt: error.message, url: process.env.FRONT_LOGIN_URL })
            );
        }
    }
);

module.exports = router;