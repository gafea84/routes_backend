const router = require('express').Router();

const { manageRouterError } = require('../../../helpers/router_utils');
const { formatSearchResult } = require('../../../helpers/searchUtils/searchresult_utils');
const { getByPage, getAll } = require('../../../models/ramas.model');

// Recuperamos todas las ramas o de manera paginada.
router.get(
    '/', 
    async (req, res) => {        
        try {
            const { page, limit } = req.query;

            let ramas;
            if (page && limit) { // Creo que no es muy útil si no se sabe el número filas en el front...
                ramas = await getByPage(parseInt(page), parseInt(limit));
            }
            else {
                ramas = await getAll();
            }
            
            res.json(formatSearchResult(ramas));
        } catch (error) {            
            manageRouterError(res, error);
        }
    }
);

module.exports = router;