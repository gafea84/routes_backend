const router = require('express').Router();

const { idParamValidator } = require('../../../helpers/validators/idParam.validator');
const { checkValidationsResult } = require('../../../helpers/validator_utils');
const { alumnoRoleDescription, profesorRoleDescription } = require('../../../models/roles.model');
const { getByUserId: getAlumnoByUserId } = require('../../../models/alumnos.model');
const { getById: getProfesorById, getByUserId: getProfesorByUserId, updatePuntuacionTrans, addPuntuacionTrans } = require('../../../models/profesores.model');
const { checkRole } = require('../../../helpers/token_utils');
const { manageRouterError } = require('../../../helpers/router_utils');
const { getById: getInscripcionById, accept, create, opinionTrans, searchInscripcionesByProfesorId, searchByProfesorIdFields, searchInscripcionesByAlumnoId, searchByAlumnoIdFields, getByAlumnoIdProfesorId } = require('../../../models/inscripciones.model');
const { success } = require('../../../helpers/success_utils');
const { opinionValidationSchema } = require('../../../helpers/validators/opinion.validator');
const { checkSchema } = require('express-validator');
const { beginTransaction, rollBack, commit } = require('../../../helpers/mysql_utils');
const { searchValidationSchema } = require('../../../helpers/validators/search.validator');
const { pageLimitValidationSchema } = require('../../../helpers/validators/pagelimit.validator');
const { formatSearchResult } = require('../../../helpers/searchUtils/searchresult_utils');

// Inscribirse con un profesor.
// (Solo lo podrá hacer un alumno)
router.post(
    '/signup/:id',
    checkRole(alumnoRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const idUsuario   = req.user.id;
            const idAlumno    = (await getAlumnoByUserId(idUsuario)).id;
            const idProfesor  = req.params.id;

            const inscripcion = await getByAlumnoIdProfesorId(idProfesor, idAlumno);
            if (inscripcion !== null) {
                return res.status(400)
                          .json({ messageError: 'Ya existe una inscripción de ese alumno al profesor indicado' });
            }

            const profesor    = await getProfesorById(idProfesor);
            if (profesor === null) {
                return res.status(404)
                          .json({ messageError: 'No existe el profesor especificado' });
            }

            if (profesor.validado === 0) {
                return res.status(400)
                          .json({ messageError: 'El profesor indicado todavía no está validado' });
            }
            
            await create(idAlumno, idProfesor);

            res.json(success);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Aceptar la inscripción de un alumno.
// (Solo lo podrá hacer un profesor, y la inscripción tiene que haberse hecho a él)
router.put(
    '/accept/:id',
    checkRole(profesorRoleDescription),
    idParamValidator,
    checkValidationsResult,
    async (req, res) => {
        try {
            const idInscripcion = req.params.id;
            const idUsuario     = req.user.id;
            const idProfesor    = (await getProfesorByUserId(idUsuario)).id;

            const inscripcion   = await getInscripcionById(idInscripcion);
            if (inscripcion == null) {
                return res.status(404)
                          .json({ messageError: 'No existe la inscripción especificada' });
            }

            if (inscripcion.profesoresId !==  idProfesor) {
                return res.status(401)
                          .json({ messageError: 'No tiene acceso a una inscripción de otro profesor' });
            }

            await accept(idInscripcion);

            res.json(success);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// El alumno puntúa al profesor.
// (Solo lo podrá hacer un alumno, y la inscripción tiene que ser suya)
router.put(
    '/opinion',
    checkRole(alumnoRoleDescription),
    checkSchema(opinionValidationSchema),
    checkValidationsResult,
    async (req, res) => {
        try {
            const idUsuario   = req.user.id;
            const idAlumno    = (await getAlumnoByUserId(idUsuario)).id;

            const db = await beginTransaction();

            try {                
                const inscripcion = await getInscripcionById(req.body.id);
                if (inscripcion == null) {
                    return res.status(404)
                              .json({ messageError: 'No existe la inscripción especificada' });
                }

                if (inscripcion.alumnosId !== idAlumno) {
                    return res.status(401)
                              .json({ messageError: 'No tiene acceso a una inscripción de otro alumno' });
                }

                if (inscripcion.estado === 0) {
                    return res.status(401)
                              .json({ messageError: 'La inscripción todavía no está aceptada' });
                }

                const profesor = await getProfesorById(inscripcion.profesoresId);
                if (profesor === null) {
                    return res.status(401)
                              .json({ messageError: 'No se pudo recuperar el profesor asociado a la inscripción' });
                }

                if (inscripcion.puntuacion !== null) {
                    const puntuacionVariation = req.body.puntuacion - inscripcion.puntuacion;
                    await updatePuntuacionTrans(db, profesor, puntuacionVariation);
                } else {
                    await addPuntuacionTrans(db, profesor, req.body.puntuacion);
                }

                await opinionTrans(db, req.body);

                await commit(db);
            }
            catch(exception) {
                await rollBack(db);
                throw exception;
            }

            res.json(success);
        } catch (error) {
            manageRouterError(res, error);
        }
    }
);

// Recuperamos las inscripciones (de manera paginada - opcional-, con filtros y group by - opcional -).
// Solo lo podrá hacer un profesor --> peticiones de inscripciones para él.
router.post(
    '/profesores/getSearch', 
    checkRole(profesorRoleDescription),
    checkSchema(searchValidationSchema(searchByProfesorIdFields)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            const profesor = await getProfesorByUserId(req.user.id);
            if (profesor === null) {
                return res.status(401)
                          .json({ messageError: 'No se pudo recuperar el profesor del token' });
            }

            const inscripciones = await searchInscripcionesByProfesorId(req.body, profesor.id, page, limit);
            
            res.json(formatSearchResult(inscripciones));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

// Recuperamos las inscripciones (de manera paginada - opcional-, con filtros y group by - opcional -).
// Solo lo podrá hacer un alumnos --> inscripciones hechas por él.
router.post(
    '/alumnos/getSearch', 
    checkRole(alumnoRoleDescription),
    checkSchema(searchValidationSchema(searchByAlumnoIdFields)),
    checkSchema(pageLimitValidationSchema),
    checkValidationsResult,
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            const alumno = await getAlumnoByUserId(req.user.id);
            if (alumno === null) {
                return res.status(401)
                          .json({ messageError: 'No se pudo recuperar el alumno del token' });
            }

            const inscripciones = await searchInscripcionesByAlumnoId(req.body, alumno.id, page, limit);
            
            res.json(formatSearchResult(inscripciones));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

module.exports = router;