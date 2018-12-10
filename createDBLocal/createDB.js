const dbConfig = require('../setting').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);

// db.authenticate().then(() => {
//   console.log('Success');
// }).catch(e => console.log(e))

const Users = db.define('User', {
  userID: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true},
  username: {type: Sequelize.STRING, allowNull: false},
  password: {type: Sequelize.STRING, allowNull: false}
})

// db.sync().then(() => {console.log('Successfully')})

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
