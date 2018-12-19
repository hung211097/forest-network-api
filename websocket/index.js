const db = require('../config/config');
const moment = require('moment');
const { RpcClient } = require('tendermint')
const { encode, decode, verify, sign, hash } = require('../lib/transaction')
const { BANDWIDTH_PERIOD, MAX_CELLULOSE, NETWORK_BANDWIDTH } = require('../constants')
const websocket_url = require('../settingDev').node_url_websocket;
const node_url = require('../settingDev').node_url;
const { decodePost, decodeFollowing } = require('../lib/transaction/v1')
const base32 = require('base32.js');

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
            await createTransaction(deData, item.block.header.time)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await Users.update({
              sequence: deData.sequence
            },{
              where: {
                public_key: deData.account
              }
            }).then(() => {}).catch(e => console.log("ERROR", e))
            let key = deData.params.key
            if(key === 'name' || key === 'picture' || key === 'followings'){
              if(key === 'followings'){
                try{
                  decodeFollowing(deData.params.value)
                }
                catch(e){
                  return
                }
              }
              await updateAccount(deData)
            }
            break
          case 'post':
            await createTransaction(deData, item.block.header.time)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await Users.update({
              sequence: deData.sequence
            },{
              where: {
                public_key: deData.account
              }
            }).then(() => {}).catch(e => console.log("ERROR", e))
            try{
              decodePost(deData.params.content)
            }
            catch(e){
              return
            }
            await createPost(deData, item.block.header.time)
            break
          default:
            break
        }
      }
  })
}

async function createTransaction(deData, time){
  await Users.findOne({
    where:{
      public_key: deData.account
    }
  }).then((res) => {
    if(res){
      return Transactions.create({
        public_key: deData.account,
        public_key_received: deData.params.address ? deData.params.address : '',
        amount: deData.params.amount ? deData.params.amount : 0,
        operation: deData.operation,
        created_at: time,
        memo: deData.memo.toString() ? deData.memo.toString() : '',
        user_id: res.user_id
      })
    }
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
      let arr = []
      let objFollow = decodeFollowing(deData.params.value).addresses
      objFollow.forEach((item) => {
        arr.push(base32.encode(item))
      })
      return Users.findOne({
        where:{
          public_key: deData.account
        }
      }).then(async (user) => {
        let arrRes = []
        await getListFollow (arr, arrRes)
        let arrUnfollow = []
        let arrNewfollow = arrRes.slice()
        if(user.following && user.following.length){
          arrUnfollow = user.following.slice()
          user.following.forEach((item) => {
            arrNewfollow = arrNewfollow.filter((filterItem) => {
              return filterItem !== item
            })
          })
          arrRes.forEach((item) => {
            arrUnfollow = arrUnfollow.filter((filterItem) => {
              return filterItem !== item
            })
          })
        }

        await Users.update({
          following: arrRes
        },{
          where: {
            user_id: user.user_id
          }
        })

        if(arrNewfollow.length){
          await updateFollowing(arrNewfollow, user.user_id)
        }
        if(arrUnfollow.length){
          await updateFollower(arrUnfollow, user.user_id)
        }
      })
      break;
    default:
      break;
  }
}

async function updateFollowing(arr, user_id){
  await asyncForEach(arr, async (id, index) => {
    return Users.findOne({
      where:{
        user_id: id
      }
    }).then((info) => {
      if(!info.follower || (info.follower && !info.follower.length)){
        info.follower = []
      }
      info.follower.push(user_id)
      return Users.update({
        follower: info.follower
      },{
      where: {
          user_id: id
        }
      })
    })
  })
}

async function updateFollower(arr, user_id){
  await asyncForEach(arr, async (id, index) => {
    return Users.findOne({
      where:{
        user_id: id
      }
    }).then((info) => {
      info.follower = info.follower.filter((temp) => {
        return temp !== user_id
      })
      return Users.update({
        follower: info.follower
      },{
        where: {
          user_id: id
        }
      })
    })
  })
}

async function getListFollow(arrSrc, arrRes){
  await asyncForEach(arrSrc, async (item, index) => {
    let follow = await Users.findOne({
      where: {
        public_key: item
      }
    }).catch(e => console.log(e))
    // console.log(follow);
    arrRes.push(follow.user_id)
  })
}

async function createPost(deData, time){
  return Users.findOne({
    where: {
      public_key: deData.account
    }
  }).then((user) => {
    if(user){
      let content = decodePost(deData.params.content).text
      // let content = JSON.parse(deData.params.content.toString('utf8'))
      return Posts.create({
        user_id: user.user_id,
        content: content,
        created_at: time
      }).then(() => {}).catch(e => console.log("ERROR CREATE POST", e))
    }
  }).catch(e => console.log("ERROR", e))
}


module.exports = StartWebSocket;
