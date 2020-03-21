'use strict'

// Special thanks to @victorfern91 @hugoduraes @ludwig801 @palminha @zepcp @lcfb91 @jcazevedo @cchostak for the work and efforts to bootstrap this service!
// Feel free to change / improve / delete everything you want!

const fastify = require('fastify')({ logger: false });
const path = require('path');
const AutoLoad = require('fastify-autoload');
const fsequelize = require('fastify-sequelize');
const oauthPlugin = require('fastify-oauth2');
const oas = require('fastify-oas');
const swagger = require('./config/swagger');

fastify.register(oas, swagger.options);

const dotEnv = require('dotenv').config();

const sequelizeConfig = {
  instance: 'sequelize',
  autoConnect: true,
  dialect: 'postgres',
  timezone: 'utc',
  dialectOptions: {
    dateStrings: true,
    typeCast: true
  },
  pool: {
    max: 100,
    min: 1,
    acquire: 30000,
    idle: 10000
  },
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS
}

fastify.register(
  require('fastify-rate-limit'), {
  max: 60,
  timeWindow: '1 minute'
})

fastify.register(
  require('fastify-helmet'), {
  hidePoweredBy: {
    setTo: 'Trackovid-19 Server'
  }
})

fastify
  .register(fsequelize, sequelizeConfig)
  .ready()

fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'plugins'),
  //options: Object.assign({}, opts)
})

fastify.register(AutoLoad, {
  dir: path.join(__dirname, 'controllers/v1'),
  options: Object.assign({}, { prefix: '/api/v1' })
})

fastify.register(require('fastify-axios'))

fastify.register(require('fastify-cors'), {
  origin: ['https://www.covidografia.pt', 'https://api.covidografia.pt', 'https://covidografia.pt'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST']
})


fastify.register(oauthPlugin, {
  name: 'facebookOAuth2',
  credentials: {
    client: {
      id: process.env.FB_APP_ID,
      secret: process.env.FB_APP_SECRET
    },
    auth: oauthPlugin.FACEBOOK_CONFIGURATION
  },
  startRedirectPath: '/login/facebook',
  callbackUri: `${process.env.FB_CALLBACK_URL}/login/facebook/callback`,
  scope: 'email,public_profile'
})

// Support for AWS Lambda
if (process.env.LAMBDA_TASK_ROOT && process.env.AWS_EXECUTION_ENV) {
  const serverless = require('serverless-http');
  module.exports.handler = serverless(fastify);
} else {
  fastify.listen(process.env.PORT, err => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    fastify.oas();
    console.log(`server listening on ${fastify.server.address().port}`);
  })
}



