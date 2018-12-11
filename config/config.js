const dbConfig = require('../settingDev').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);

let objDB = {};
objDB.sequelize = db;
objDB.user = require('../models/user')(db, Sequelize);
objDB.transaction = require('../models/transaction')(db, Sequelize);
objDB.blockchain = require('../models/infoBC')(db, Sequelize);

objDB.sequelize.sync();
module.exports = objDB;
