const router = require('express').Router();
const bcrypt = require('bcrypt');
const { checkSchema } = require('express-validator');
const { create, getById, searchPublic, searchFieldsPublic } = require('../../../models/profesores.model');
const { getById: getUsuarioById, updateImage } = require('../../../models/usuarios.model');
const { checkValidationsResult, checkValidationsResultImage } = require('../../../helpers/validator_utils');
const { manageRouterError } = require('../../../helpers/router_utils');
const { getProfesorValidationSchema } = require('../../../helpers/validators/profesores.validator');
const { publicTeacherSearchValidationSchema } = require('../../../helpers/validators/profesorespublic_search.validator');
const { pageLimitValidationSchema } = require('../../../helpers/validators/pagelimit.validator');
const { formatSearchResult } = require('../../../helpers/searchUtils/searchresult_utils');
const { validateToken } = require('../../../helpers/token_utils');
const { opinionesPublicValidationSchema } = require('../../../helpers/validators/opinionespublic.validator');
const { searchOpiniones, searchOpinionesFields } = require('../../../models/inscripciones.model');
const { userImage, upload, checkUserImage } = require('../../../helpers/image_utils');

// Creación de un nuevo profesor.
router.post(
    '/register',    
    upload.single('imagen'),
    checkSchema(getProfesorValidationSchema(true)),
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

            const profesorId = await create(req.body);
            profesor = await getById(profesorId);
            usuario  = await getUsuarioById(profesor.usuarioId);
            delete usuario.id;

            // Hace falta el id del usuario para tratar la imagen,
            // por eso se actualiza fuera de la transacción de BD
            // ese campo. Si falla, no se puede tratar como error
            // porque el usuario ya se ha dado de alta en la BD.
            // (Simplemente quedará sin avatar, lo podrá actuali-
            //  zar después).
            try {
                if (req.file) {
                    const imageResult = userImage(profesor.usuarioId, req.file);
                    if (imageResult.ok) {
                        await updateImage(profesor.usuarioId, imageResult.fileName);
                        usuario.imagen = imageResult.fileName;
                    }
                }
            } catch (error) {
                console.log(`Usuario ${profesor.usuarioId} queda sin avatar [${error.message}].`)
            }

            res.json({...usuario, ...profesor});
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Búsqueda de profesores de la parte pública. A diferencia de en la parte privada,
// aquí se pasa como criterio de búsqueda unas coordenadas y una distancia máxima a
// ese punto. Por lo demás, se reciben los criterios de búsqueda, ordenación y pagi-
// nación de cualquier petición de búsqueda.
// IMPORTANTE: si estamos con un token válido, además podremos ver los datos de
// contacto del profesor (email y teléfono)
router.post(
    '/getSearch', 
    checkSchema(publicTeacherSearchValidationSchema(searchFieldsPublic)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            const logged = await validateToken(req);

            profesores = await searchPublic(req.body, logged, page, limit);
            
            res.json(formatSearchResult(profesores));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

// Opiniones de un profesor.
router.post(
    '/opiniones/get', 
    checkSchema(opinionesPublicValidationSchema(searchOpinionesFields)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            const opiniones = await searchOpiniones(req.body, page, limit);
            
            res.json(formatSearchResult(opiniones));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

module.exports = router;