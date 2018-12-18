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
  public_key: {type: Sequelize.STRING, allowNull: false, unique: true},
  username: {type: Sequelize.STRING, allowNull: false},
  avatar: {type: Sequelize.TEXT, allowNull: true},
  sequence: {type: Sequelize.INTEGER, allowNull: false},
  amount: {type: Sequelize.BIGINT, allowNull: false, defaultValue: 0},
  following: {type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: true, defaultValue: []},
  follower: {type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: true, defaultValue: []},
  bandwith: {type: Sequelize.INTEGER, allowNull: false, defaultValue: 0},
  bandwithMax: {type: Sequelize.INTEGER, allowNull: false },
  bandwithTime: {type: Sequelize.DATE, allowNull: false }
})

const Transactions = db.define('Transactions', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  public_key: {type: Sequelize.STRING, allowNull: false},
  public_key_received: {type: Sequelize.STRING, allowNull: false},
  created_at: {type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW},
  amount: {type: Sequelize.BIGINT, allowNull: false},
  operation: {type: Sequelize.STRING, allowNull: false},
  memo: {type: Sequelize.TEXT, allowNull: true}
})

const Info = db.define('Blockchains', {
  height: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true},
})

const Posts = db.define('Posts', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  content: {type: Sequelize.TEXT, allowNull: false},
  created_at: {type: Sequelize.DATE, allowNull: false},
})

const Comments = db.define('Comments', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  content: {type: Sequelize.TEXT, allowNull: false},
  created_at: {type: Sequelize.DATE, allowNull: false},
})


Users.hasMany(Transactions, {foreignKey: 'user_id'})
Transactions.belongsTo(Users, {foreignKey: 'user_id'})

Users.hasMany(Posts, {foreignKey: 'user_id'})
Posts.belongsTo(Users, {foreignKey: 'user_id'})

Users.hasMany(Comments, {foreignKey: 'user_id'})
Comments.belongsTo(Users, {foreignKey: 'user_id'})
Posts.hasMany(Comments, {foreignKey: 'post_id'})
Comments.belongsTo(Posts, {foreignKey: 'post_id'})

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
    for(let i = 9583; i <= 9583; i++){ //5501 -> 6000
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

// Transactions.count({
//   where: {
//     public_key: 'GBIDPG4BFSTJSR3TYPJG4S4R2MEZX6U6FK5YJVIGD4ZJ3LTM4B5IS4RB'
//   }
// }).then((res) => {
//   console.log(res);
// })


// db.sync();

// FetchData()

Users.count({
  where:{
    user_id: ["23", "14"]
  }
}).then((res) => {console.log(res)})

// Transactions.findAll({
//   where:{
//     public_key: 'GAO4J5RXQHUVVONBDQZSRTBC42E3EIK66WZA5ZSGKMFCS6UNYMZSIDBI'
//   },
//   include: [{model:Users, where:{user_id: 1}}]
// }).then((res) => console.log(res))

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
  await Users.findOne({
    where:{
      public_key: deData.account
    }
  }).then((res) => {
    if(res){
      return Transactions.create({
        public_key: deData.account,
        public_key_received: deData.params.address,
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
      return Users.findOne({
        where:{
          public_key: deData.account
        }
      }).then(async (user) => {
        let arrRes = []
        let arrSrc = []
        arr.forEach((item) => {
          arrSrc.push(Buffer.from(item.data, 'base32').toString())
        })
        await getListFollow (arrSrc, arrRes)
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
    console.log(item);
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

module.exports = db;
