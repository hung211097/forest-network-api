const dbConfig = require('../setting').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);

let objDB = {};
objDB.sequelize = db;
objDB.user = require('../models/user')(db, Sequelize);
module.exports = objDB;
