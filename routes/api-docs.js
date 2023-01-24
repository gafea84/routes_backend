const router = require('express').Router();

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'teacherApp API',
      description: 'TFM: eebApp para la gestión y localización de profesores de clases particulares categorizados. Máster full stack devoloper. UNIR.',
      version: '1.0.0',
    }
  },
  apis: [
    './routes/*.swagger',
    './routes/*/*.swagger',
    './routes/*/*/*.swagger'
  ]
};

const swaggerSpec  = swaggerJsdoc(options);

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec ));

module.exports = router;