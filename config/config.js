const dbConfig = require('../settingDev').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);

let objDB = {
  Users: require('../models/user')(db, Sequelize),
  Transactions: require('../models/transaction')(db, Sequelize),
  Info: require('../models/infoBC')(db, Sequelize),
  Posts: require('../models/posts')(db, Sequelize),
  Comments: require('../models/comments')(db, Sequelize),
  Follows: require('../models/follows')(db, Sequelize)
};

Object.keys(objDB).forEach((modelName) => {
  if('associate' in objDB[modelName]){
    objDB[modelName].associate(objDB)
  }
})

db.sync();
module.exports = objDB;
