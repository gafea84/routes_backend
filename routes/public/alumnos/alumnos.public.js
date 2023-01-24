const router = require('express').Router();
const bcrypt = require('bcrypt');
const { checkSchema } = require('express-validator');

const { getAlumnoValidationSchema } = require('../../../helpers/validators/alumnos.validator');
const { checkValidationsResultImage } = require('../../../helpers/validator_utils');
const { create } = require('../../../models/alumnos.model');
const { updateImage } = require('../../../models/usuarios.model');
const { manageRouterError } = require('../../../helpers/router_utils');
const { success } = require('../../../helpers/success_utils');
const { upload, checkUserImage, userImage } = require('../../../helpers/image_utils');

// Creación de un nuevo alumno.
router.post(
    '/register', 
    upload.single('imagen'),
    checkSchema(getAlumnoValidationSchema(true)),
    checkValidationsResultImage,
    async (req, res) => {
        try {
            req.body.password = bcrypt.hashSync(req.body.password, 8);

            if (req.file) {
                const checkResult = checkUserImage(req.file);
                if (!checkResult.ok) {
                    return res.status(checkResult.statuscode)
                              .json({ messageError: checkResult.messageError });
                }
            }

            const alumno = await create(req.body);

            try {
                if (req.file) {
                    const imageResult = userImage(alumno.usuarioId, req.file);
                    if (imageResult.ok) {
                        await updateImage(alumno.usuarioId, imageResult.fileName);
                        usuario.imagen = imageResult.fileName;
                    }
                }
            } catch (error) {
                console.log(`Usuario ${alumno.usuarioId} queda sin avatar [${error.message}].`)
            }

            res.json(success);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

module.exports = router;