const { beginTransaction, commit, rollBack } = require('../../helpers/mysql_utils');
const { manageRouterError } = require('../../helpers/router_utils');
const { updateNotPasswordFieldsTrans, getByEmailNotId, getByUserNameNotId, getById } = require('../../models/usuarios.model');
const { completeUser } = require('../../models/completeUser');

const updateUserFields = async (req, res, updateNoUserFields) => {
    try {
        const id = req.user.id;

        // Validamos que el email no lo tenga otro usuario con otro id distinto
        // (no sé como pasarlo al validador)
        let usuario = await getByEmailNotId(req.body.email, id);
        if (usuario !== null) {                
            return res.status(400)
                      .json({ errorMessage: getErrorFieldStr(ErrorType.ERROR_ALREADY_EXISTS, 'email', 'alumno') });
        }

        // Lo mismo para el userName
        usuario = await getByUserNameNotId(req.body.userName, id);
        if (usuario !== null) {
            return res.status(400)
                      .json({ errorMessage: getErrorFieldStr(ErrorType.ERROR_ALREADY_EXISTS, 'userName', 'alumno') });
        }

        const db = await beginTransaction();
        try {
            await updateNotPasswordFieldsTrans(id, req.body);
            usuario = await getById(id);

            await updateNoUserFields(db, req.body);
            
            await commit(db);
        } catch(exception) {
            await rollBack(db);
            throw exception;
        }

        const completedUsuario = await completeUser(usuario);
        res.json(completedUsuario);
    } catch (error) {
        manageRouterError(res, error);
    }
}

module.exports = { updateUserFields };