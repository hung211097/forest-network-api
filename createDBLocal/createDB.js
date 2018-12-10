const dbConfig = require('../setting').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);

// db.authenticate().then(() => { //Test connect Database
//   console.log('Success');
// }).catch(e => console.log(e))

const Users = db.define('Users', {
  public_key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
  tendermint_address: {type: DataTypes.STRING, allowNull: true},
  username: {type: DataTypes.STRING, allowNull: false},
  sequence: {type: Sequelize.INTEGER, allowNull: false}
})

const Transactions = db.define('Transactions', {
  public_key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
  public_key_received: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
  created_at: {type: Sequelize.DATE, allowNull: false, primaryKey: true, defaultValue: Sequelize.NOW},
  amount: {type: DataTypes.INTEGER, allowNull: false},
  operation: {type: Sequelize.STRING, allowNull: false}
})

const Info = sequelize.define('Blockchains', {
  height: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true},
}

db.sync().then(() => {console.log('Successfully')})

// Users.bulkCreate([
//   {userID: 1, username: 'yasuo', password: '123456'},
//   {userID: 2, username: 'zed', password: '123456'},
//   {userID: 3, username: 'helo', password: '123456'},
// ]).then(() => {console.log("Successfully")})

// let db = {};
// db.Sequelize = Sequelize;
// db.sequelize = sequelize;

// db.user = require('../models/user')(sequelize, Sequelize);
module.exports = db;
