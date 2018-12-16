const db = require('../config/config');
const moment = require('moment');
const { RpcClient } = require('tendermint')
const { encode, decode, verify, sign, hash } = require('../lib/transaction')
const { BANDWIDTH_PERIOD, MAX_CELLULOSE, NETWORK_BANDWIDTH } = require('../constants')
const websocket_url = require('../settingDev').node_url_websocket;
const node_url = require('../settingDev').node_url;

const Users = db.Users;
const Transactions = db.Transactions;
const Info = db.Info;
const Posts = db.Posts;
const Comments = db.Comments;
const Follows = db.Follows;

const FetchData = (newBlock) => {
  console.log("BEGIN ADD NEW DATA");
  const fetch = RpcClient(node_url)
  let fromBlock = 0;
  let toBlock = newBlock.header.height;
  toBlock = +res.block_meta.header.height

  Info.findAll().then((dataHeight) => {
    if(!dataHeight.length){
      Info.create({height: toBlock}).then(() => {}).catch(e => {console.log("ERROR INSERT HEIGHT", e)})
    }
    else{
      Info.update({height: toBlock}, {where: {height: dataHeight[0].height}}).then(() => {}).catch(e => {console.log("ERROR UPDATE HEIGHT", e)})
    }

    let query = []
    for(let i = dataHeight[0].height; i <= toBlock; i++){
      query.push(fetch.block({height: i}))
    }
    Promise.all(query).then((result) => {
      startImportDB(result)
    }).catch(e => console.log("ERROR PROMISE", e))
  }).catch(e => console.log("ERROR FIND HEIGHT"))
}

const StartWebSocket = () => {
  const client = RpcClient(websocket_url)
  client.subscribe({ query: "tm.event='NewBlock'" }, (err, event) => {
    // FetchData(newBlock)
    console.log(err, event)
  }).catch(e => console.log("ERROR", e))
}

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
          case 'update_account':
            let key = deData.params.key
            if(key === 'name' || key === 'picture' || key === 'followings'){
              await updateAccount(deData)
              await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            }
            break
          case 'post':
            await createPost(deData, item.block.header.time)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
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
      if(account.bandwithTime && account.sequence !== 1){
        if(moment(currentTime).unix() - moment(account.bandwithTime).unix() < BANDWIDTH_PERIOD){
          diff = moment(currentTime).unix() - moment(account.bandwithTime).unix()
        }
      }
      const bandwidthLimit = Math.floor(account.amount / MAX_CELLULOSE * NETWORK_BANDWIDTH)
      // 24 hours window max 65kB
      const bandwidthConsume = Math.ceil(Math.max(0, (BANDWIDTH_PERIOD - diff) / BANDWIDTH_PERIOD) * account.bandwith + txSize)
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

async function updateAccount(deData){
  switch(deData.params.key)
  {
    case 'name':
      return Users.update({
        username: deData.params.value.toString('utf8')
      },{
        where: {
          public_key: deData.account
        }
      }).then(() => {}).catch(e => console.log("ERROR UPDATE NAME", e))
    case 'picture':
      return Users.update({
        avatar: 'data:image/jpeg;base64,' + deData.params.value.toString('base64')
      },{
        where: {
          public_key: deData.account
        }
      }).then(() => {}).catch(e => console.log("ERROR UPDATE PICTURE", e))
      break;
    case 'followings':
      let arr = JSON.parse(deData.params.value.toString('utf8')).addresses
      asyncForEach(arr, async (item, index) => {
        await Follows.create({
         public_key_follower: deData.account,
         public_key_following: Buffer.from(item.data, 'base32').toString()
       }).then(() => {}).catch(e => console.log("ERROR CREATE FOLLOWINGS", e))
      })
      break;
    default:
      break;
  }
}

async function createPost(deData, time){
  return Users.findOne({
    where: {
      public_key: deData.account
    }
  }).then((user) => {
    if(user){
      let content = null
      try{
        content = JSON.parse(deData.params.content.toString('utf8'))
      }
      catch(e){
        return
      }
      return Posts.create({
        user_id: user.user_id,
        content: content.text,
        created_at: time
      }).then(() => {}).catch(e => console.log("ERROR CREATE POST", e))
    }
  }).catch(e => console.log("ERROR", e))
}

module.exports = StartWebSocket;
