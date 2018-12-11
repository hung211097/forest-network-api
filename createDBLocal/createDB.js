const dbConfig = require('../settingDev').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);
const { RpcClient } = require('tendermint')
const { encode, decode, verify, sign, hash } = require('../lib/transaction')

// db.authenticate().then(() => { //Test connect Database
//   console.log('Success');
// }).catch(e => console.log(e))

const Users = db.define('Users', {
  public_key: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  tendermint_address: {type: Sequelize.STRING, allowNull: true},
  username: {type: Sequelize.STRING, allowNull: false},
  sequence: {type: Sequelize.INTEGER, allowNull: false},
})

const Transactions = db.define('Transactions', {
  public_key: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  public_key_received: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  created_at: {type: Sequelize.DATE, allowNull: false, primaryKey: true, defaultValue: Sequelize.NOW},
  amount: {type: Sequelize.BIGINT, allowNull: false},
  operation: {type: Sequelize.STRING, allowNull: false}
})

const Info = db.define('Blockchains', {
  height: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true},
})

// db.sync();

const client = RpcClient('https://komodo.forest.network:443/websocket')
let fromBlock = 0;
let toBlock;
client.block().then((res) => {
  // console.log(res)
  toBlock = +res.block_meta.header.height
  Info.findAll().then((dataHeight) => {
    if(!dataHeight.length){
      Info.create({height: toBlock}).then(() => {}).catch(e => {console.log("ERROR INSERT HEIGHT", e)})
    }
    else{
      Info.update({height: toBlock}, {where: {height: dataHeight[0].height}}).then(() => {}).catch(e => {console.log("ERROR UPDATE HEIGHT", e)})
    }
  }).catch(e => console.log("ERROR FIND HEIGHT"))
  let query = []
  for(let i = 1; i <= toBlock; i++){
    query.push(client.block({height: i}))
  }

  Promise.all(query).then((result) => {
    result.forEach((item, index) => {
      if(item.block.data.txs){
        const buf = Buffer.from(item.block.data.txs[0], 'base64')
        const deData = decode(buf)
        switch(deData.operation)
        {
          case 'create_account':
            Users.create({
              public_key: deData.params.address,
              tendermint_address: '',
              username: "User " + (index + 1),
              sequence: 0
            }).then(() => {
              createTransaction(deData, item.block.header.time)
            })
            break
          case 'payment':
            createTransaction(deData, item.block.header.time)
            break
          default:
            break
        }
      }
    })
  }).catch(e => console.log("ERROR PROMISE", e))
})

function createTransaction(deData, time){
  Transactions.create({
    public_key: deData.account,
    public_key_received: deData.params.address,
    amount: deData.params.amount ? deData.params.amount : 0,
    operation: deData.operation,
    created_at: time
  }).then(() => {
    Users.update({
      sequence: deData.sequence
    },
    {
      where: {
         public_key: deData.account
       }
    }).then(() => {}).catch(e => console.log("ERROR UPDATE", e))
  }).catch(e => console.log("ERROE CREATE TRANSACTION", e))
}

module.exports = db;
