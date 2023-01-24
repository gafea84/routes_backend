const router = require('express').Router();

const { checkToken } = require('../helpers/token_utils');

router.use('/public', require('./public/public'));
router.use('/private', checkToken, require('./private/private'));

module.exports = router;