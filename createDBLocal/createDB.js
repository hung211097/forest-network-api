const dbConfig = require('../settingDev').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);
const moment = require('moment');
const { RpcClient } = require('tendermint')
const { encode, decode, verify, sign, hash } = require('../lib/transaction')
const BANDWIDTH_PERIOD = 86400;
const MAX_CELLULOSE = 9007199254740991;
const NETWORK_BANDWIDTH = BANDWIDTH_PERIOD * 22020096;

// db.authenticate().then(() => { //Test connect Database
//   console.log('Success');
// }).catch(e => console.log(e))

const Users = db.define('Users', {
  user_id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  public_key: {type: Sequelize.STRING, allowNull: false},
  tendermint_address: {type: Sequelize.STRING, allowNull: true},
  username: {type: Sequelize.STRING, allowNull: false},
  sequence: {type: Sequelize.INTEGER, allowNull: false},
  amount: {type: Sequelize.BIGINT, allowNull: false, defaultValue: 0},
  bandwith: {type: Sequelize.INTEGER, allowNull: false, defaultValue: 0},
  bandwithMax: {type: Sequelize.INTEGER, allowNull: false },
  bandwithTime: {type: Sequelize.DATE, allowNull: false }
})

const Transactions = db.define('Transactions', {
  public_key: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  public_key_received: {type: Sequelize.STRING, allowNull: false, primaryKey: true},
  created_at: {type: Sequelize.DATE, allowNull: false, primaryKey: true, defaultValue: Sequelize.NOW},
  amount: {type: Sequelize.BIGINT, allowNull: false},
  operation: {type: Sequelize.STRING, allowNull: false},
  memo: {type: Sequelize.TEXT, allowNull: true}
})

const Info = db.define('Blockchains', {
  height: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true},
})


const FetchData = () => {
  const client = RpcClient('https://dragonfly.forest.network:443')
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
    for(let i = 5501; i <= 6000; i++){
      query.push(client.block({height: i}))
    }
    Promise.all(query).then((result) => {
      // result.forEach((item) => {
      //   if(item.block.data.txs){
      //     const buf = Buffer.from(item.block.data.txs[0], 'base64')
      //     const deData = decode(buf)
      //     console.log(deData);
      //   }
      // })

      startImportDB(result)
    }).catch(e => console.log("ERROR PROMISE", e))
  })
}

// db.sync();

// FetchData()
// const client = RpcClient('wss://komodo.forest.network:443')
// client.subscribe({ query: "tm.event='NewBlock'" }, (err, event) => {
//   console.log("OK");
//   console.log(err, event)
// }).catch(e => console.log("ERROR", e))

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index);
  }
  console.log("OVER");
}

const startImportDB = async (result) => {
  await asyncForEach(result, async (item, index) => {
    if(item.block.data.txs){
        const buf = Buffer.from(item.block.data.txs[0], 'base64')
        const deData = decode(buf)
        console.log(deData);
        switch(deData.operation)
        {
          case 'create_account':
            await Users.create({
              public_key: deData.params.address,
              tendermint_address: '',
              username: "User " + (index + 1),
              sequence: 0,
              bandwithTime: item.block.header.time,
              bandwithMax: 0
            })
            await createTransaction(deData, item.block.header.time)
            await adjustAmount(deData, false)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            break
          case 'payment':
            await createTransaction(deData, item.block.header.time)
            await adjustAmount(deData, false)
            await adjustAmount(deData, true)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], true)
            break
          default:
            break
        }
      }
  })
}

async function createTransaction(deData, time){
  await Transactions.create({
    public_key: deData.account,
    public_key_received: deData.params.address,
    amount: deData.params.amount ? deData.params.amount : 0,
    operation: deData.operation,
    created_at: time,
    memo: deData.memo.toString() ? deData.memo.toString() : ''
  })
}

async function adjustAmount(deData, isReceived){
  return Users.findOne({
    where: {
      public_key: isReceived ? deData.params.address : deData.account
    }
  }).then((res) => {
    if(res){
      return Users.update({
        sequence: isReceived ? res.sequence : deData.sequence,
        amount: isReceived ? +res.amount + (deData.params && deData.params.amount ? deData.params.amount : 0) :
         +res.amount - (deData.params && deData.params.amount ? deData.params.amount : 0)
      },
      {
        where: {
           public_key: isReceived ? deData.params.address : deData.account
         }
      }).then(() => {}).catch(e => console.log("ERROR UPDATE", e))
    }
  }).catch(e => console.log("ERROR FIND USER", e))
}

async function adjustBandwith(deData, time, txBase64, isCreate){
  return Users.findOne({
    where: {
      public_key: isCreate ? deData.params.address : deData.account
    }
  }).then((account) => {
    if(account && !isCreate){
      const txSize = Buffer.from(txBase64, 'base64').length
      const currentTime = time
      let diff = BANDWIDTH_PERIOD
      // console.log("CURRENT", moment(currentTime).unix());
      // console.log("LAST TIME", moment(account.bandwithTime).unix());
      if(account.bandwithTime && account.sequence !== 1){
        // console.log("MINUS", moment(currentTime).unix() - moment(account.bandwithTime).unix());
        if(moment(currentTime).unix() - moment(account.bandwithTime).unix() < BANDWIDTH_PERIOD){
          diff = moment(currentTime).unix() - moment(account.bandwithTime).unix()
        }
      }
      const bandwidthLimit = Math.floor(account.amount / MAX_CELLULOSE * NETWORK_BANDWIDTH)
      // 24 hours window max 65kB
      // console.log("ACCOUNT", account);
      // console.log("DIFF", diff);
      // console.log("bandwidthLimit", bandwidthLimit);
      // console.log("TX", txSize);

      const bandwidthConsume = Math.ceil(Math.max(0, (BANDWIDTH_PERIOD - diff) / BANDWIDTH_PERIOD) * account.bandwith + txSize)

      // console.log("bandwidthConsume", bandwidthConsume);

      // if (account.bandwidth > bandwidthLimit) {
      //   return
      // }
      // Check bandwidth
      return Users.update({
        bandwithTime: time,
        bandwith: bandwidthConsume,
        bandwithMax: bandwidthLimit
      },
      {
        where: {
           public_key: deData.account
         }
      }).then(() => {}).catch(e => console.log("ERROR UPDATE", e))
    }
    else{
      if(account){
        const bandwidthLimit = Math.floor(account.amount / MAX_CELLULOSE * NETWORK_BANDWIDTH)
        return Users.update({
          bandwithMax: bandwidthLimit
        },
        {
          where: {
            public_key: isCreate ? deData.params.address : deData.account
          }
        }).then(() => {}).catch(e => console.log("ERROR UPDATE", e))
      }
    }
  }).catch(e => console.log("ERROR FIND USER", e))
}

module.exports = db;
