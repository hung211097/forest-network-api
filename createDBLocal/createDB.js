const dbConfig = require('../settingDev').databaseConfig;
const Sequelize = require('sequelize');
const db = new Sequelize(dbConfig);
const moment = require('moment');
const { RpcClient } = require('tendermint')
const { encode, decode, verify, sign, hash } = require('../lib/transaction')
const { decodePost, decodeFollowing, decodeReact, decodeType } = require('../lib/transaction/v1')
const base32 = require('base32.js');
const transaction = require('../lib/transaction')
const chance = require('chance').Chance()

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
  bandwithTime: {type: Sequelize.DATE, allowNull: false },
  created_at: {type: Sequelize.DATE, allowNull: false},
},{
  timestamps: false
})

const Transactions = db.define('Transactions', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  public_key: {type: Sequelize.STRING, allowNull: false},
  public_key_received: {type: Sequelize.STRING, allowNull: true},
  object: {type: Sequelize.STRING, allowNull: true},
  created_at: {type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW},
  amount: {type: Sequelize.BIGINT, allowNull: false},
  operation: {type: Sequelize.STRING, allowNull: false},
  memo: {type: Sequelize.TEXT, allowNull: true}
},{
  timestamps: false
})

const Info = db.define('Blockchains', {
  height: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true},
},{
  timestamps: false
})

const Posts = db.define('Posts', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  content: {type: Sequelize.TEXT, allowNull: false},
  created_at: {type: Sequelize.DATE, allowNull: false},
  sequence: {type: Sequelize.INTEGER, allowNull: false},
  hash: {type: Sequelize.STRING, allowNull: false},
},{
  timestamps: false
})

const Comments = db.define('Comments', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  content: {type: Sequelize.TEXT, allowNull: false},
  created_at: {type: Sequelize.DATE, allowNull: false},
},{
  timestamps: false
})

const Reacts = db.define('Reacts', {
  id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
  react: {type: Sequelize.INTEGER, allowNull: true, defaultValue: 0},
},{
  timestamps: false
})


Users.hasMany(Transactions, {foreignKey: 'user_id'})
Transactions.belongsTo(Users, {foreignKey: 'user_id'})

Users.hasMany(Posts, {foreignKey: 'user_id'})
Posts.belongsTo(Users, {foreignKey: 'user_id'})

Users.hasMany(Comments, {foreignKey: 'user_id'})
Comments.belongsTo(Users, {foreignKey: 'user_id'})
Posts.hasMany(Comments, {foreignKey: 'post_id'})
Comments.belongsTo(Posts, {foreignKey: 'post_id'})

Posts.hasMany(Reacts, {foreignKey: 'post_id'})
Users.hasMany(Reacts, {foreignKey: 'user_id'})

const client = RpcClient('https://dragonfly.forest.network:443')
const FetchData = () => {
  let fromBlock = 0;
  let toBlock;
  client.block().then((res) => {
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
    for(let i = 27001; i <= 27600; i++){ //1001 -> 1500, 4001 > 4500 null
      query.push(client.block({height: i}))
    }
    Promise.all(query).then((result) => {
      startImportDB(result)
    }).catch(e => console.log("ERROR PROMISE", e))
  })
}

// db.sync();

FetchData()

// Posts.findAll({
//   where: {
//     user_id: 89
//   },
//   include: [{
//     model: Users,
//     attributes: ['username', 'user_id', 'avatar']
//   }]
// }).then((res) => {
//   console.log(res[0].User);
// })
// const Sequelize = require('sequelize');

// Posts.findAll({
//   attributes: ['id', 'content', 'created_at', 'sequence', 'hash', 'user_id', [Sequelize.fn('COUNT', Sequelize.col('Comments.id')), 'number_of_comments']],
//   where: {
//     id: 144
//   },
//   include:[
//     {
//       model: Comments,
//       attributes: [],
//     },
//     {
//       model: Reacts,
//       attributes: ['react'],
//       where:{
//         user_id: 27
//       }
//     },
//   ],
//   group: [Sequelize.col('Posts.id'), Sequelize.col('Reacts.id')],
// }).then((res) => console.log(res))


async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index);
  }
  console.log("OVER");
}

const startImportDB = async (result) => {
  await asyncForEach(result, async (item, index) => {
    if(item.block.data.txs){
      await asyncForEach(item.block.data.txs, async (block) => {
        const buf = Buffer.from(block, 'base64')
        const deData = decode(buf)
        console.log(deData);
        switch(deData.operation)
        {
          case 'create_account':
            await Users.create({
              public_key: deData.params.address,
              tendermint_address: '',
              username: chance.name(),
              sequence: 0,
              bandwithTime: item.block.header.time,
              bandwithMax: 0,
              created_at: item.block.header.time
            })
            await createTransaction(deData, item.block.header.time)
            await adjustAmount(deData, false)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await createPost(deData, item.block.header.time)
            break
          case 'payment':
            await createTransaction(deData, item.block.header.time)
            await adjustAmount(deData, false)
            await adjustAmount(deData, true)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], true)
            await createPost(deData, item.block.header.time)
            break
          case 'update_account':
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
              await createTransaction(deData, item.block.header.time)
              await updateAccount(deData, item.block.header.time, item.block.data.txs[0])
            }
            break
          case 'post':
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
            await createTransaction(deData, item.block.header.time)
            await createPost(deData, item.block.header.time)
            break
          case 'interact':
            await adjustBandwith(deData, item.block.header.time, item.block.data.txs[0], false)
            await Users.update({
              sequence: deData.sequence
            },{
              where: {
                public_key: deData.account
              }
            }).then(() => {}).catch(e => console.log("ERROR", e))

            let type = decodeType(deData.params.content).type
            let hashData = await client.tx({hash: '0x' + deData.params.object})
            let interactData = Buffer.from(hashData.tx, 'base64')
            interactData = decode(interactData)
            switch(type){
              case 1:
                await createComment(deData, interactData, deData.params.content, item.block.header.time)
                break
              case 2:
                await createReact(deData, interactData, deData.params.content, item.block.header.time)
                break
              default:
                break
            }
            break
          default:
            break
        }
      })
    }
  })
}

async function createTransaction(deData, time){
  let temp = ''
  await Users.findOne({
    where:{
      public_key: deData.account
    }
  }).then((res) => {
    if(res){
      switch(deData.operation)
      {
        case 'create_account':
          return Transactions.create({
            public_key: deData.account,
            public_key_received: deData.params.address ? deData.params.address : '',
            object: '',
            amount: deData.params.amount ? deData.params.amount : 0,
            operation: deData.operation,
            created_at: time,
            memo: `Create an account with public key ${deData.params.address}`,
            user_id: res.user_id
          })
          break
        case 'payment':
          return Transactions.create({
            public_key: deData.account,
            public_key_received: deData.params.address ? deData.params.address : '',
            object: '',
            amount: deData.params.amount ? deData.params.amount : 0,
            operation: deData.operation,
            created_at: time,
            memo: deData.memo.toString() ? deData.memo.toString() : '',
            user_id: res.user_id
          })
          break
        case 'post':
          return Transactions.create({
            public_key: deData.account,
            public_key_received: deData.params.address ? deData.params.address : '',
            object: '',
            amount: deData.params.amount ? deData.params.amount : 0,
            operation: deData.operation,
            created_at: time,
            memo: `Create a post`,
            user_id: res.user_id
          })
          break
        case 'update_account':
          switch(deData.params.key)
          {
            case 'name':
              temp = `Update username to ${deData.params.value}`
              break
            case 'picture':
              temp = `Update avatar`
              break
            case 'following':
              temp = `Update followings`
              break
            default:
              break
          }
          return Transactions.create({
            public_key: deData.account,
            public_key_received: deData.params.address ? deData.params.address : '',
            object: '',
            amount: deData.params.amount ? deData.params.amount : 0,
            operation: deData.operation,
            created_at: time,
            memo: temp,
            user_id: res.user_id
          })
          break
        case 'interact':
          let type = decodeType(deData.params.content).type
          switch(type)
          {
            case 1:
              temp = 'Comment to a transaction'
              break
            case 2:
              temp = 'React to transaction'
              break
            default:
              break
          }
          return Transactions.create({
            public_key: deData.account,
            public_key_received: deData.params.address ? deData.params.address : '',
            object: deData.params.object,
            amount: deData.params.amount ? deData.params.amount : 0,
            operation: deData.operation,
            created_at: time,
            memo: temp,
            user_id: res.user_id
          })
          break
        default:
          break
      }
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
      if(account.bandwithTime){
        if(moment(currentTime).unix() - moment(account.bandwithTime).unix() < BANDWIDTH_PERIOD){
          diff = moment(currentTime).unix() - moment(account.bandwithTime).unix()
        }
      }
      const bandwidthLimit = Math.floor(account.amount / MAX_CELLULOSE * NETWORK_BANDWIDTH)
      // 24 hours window max 65kB
      const bandwidthConsume = Math.ceil(Math.max(0, (BANDWIDTH_PERIOD - diff) / BANDWIDTH_PERIOD) * account.bandwith + txSize)
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

async function updateAccount(deData, time, txBase64){
  switch(deData.params.key)
  {
    case 'name':
      await createPost(deData, time)
      return Users.update({
        username: deData.params.value.toString('utf8')
      },{
        where: {
          public_key: deData.account
        }
      }).then(() => {}).catch(e => console.log("ERROR UPDATE NAME", e))
    case 'picture':
      await createPost(deData, time, {txBase64: txBase64})
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
        }
        if(arrRes.length){
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
        const arrUsernameFollowing = await Users.findAll({
          where: {
            user_id: arrRes
          },
          attributes: ['username']
        })
        await createPost(deData, time, {arrFollowing: arrUsernameFollowing})

        if(arrNewfollow.length){  //Update Follower for other
          await updateFollowing(arrNewfollow, user.user_id)
        }
        if(arrUnfollow.length){ //Update unfollow for other
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
    if(follow){
      arrRes.push(follow.user_id)
    }
  })
}

async function createPost(deData, time, extraData = null){
  return Users.findOne({
    where: {
      public_key: deData.account
    }
  }).then(async (user) => {
    if(user){
      let content = ''
      let strHash = ''
      let temp = Object.assign({}, deData)
      let other = null
      switch(deData.operation){
        case 'create_account':
          other = await Users.findOne({
            where: {
              public_key: deData.params.address
            }
          }).catch(e => console.log("ERROR", e))
          strHash = transaction.hash(temp)
          content = `${user.username} creates an account with username ${other.username}`
          break
        case 'payment':
          other = await Users.findOne({
            where: {
              public_key: deData.params.address
            }
          }).catch(e => console.log("ERROR", e))
          strHash = transaction.hash(temp)
          content = `${user.username} transfers ${deData.params.amount} CEL to ${other.username}`
          break
        case 'post':
          temp.params.content = decodePost(temp.params.content)
          strHash = transaction.hash(temp)
          content = temp.params.content.text
          break
        case 'update_account':
          switch(deData.params.key){
            case 'name':
              strHash = transaction.hash(temp)
              content = `${user.username} updated username to ${deData.params.value.toString('utf8')}`
              break
            case 'picture':
              strHash = transaction.hash(temp)
              content = `${user.username} updated picture with ${Buffer.from(extraData.txBase64, 'base64').length} bytes`
              break
            case 'followings':
              temp.params.value = decodeFollowing(temp.params.value)
              strHash = transaction.hash(temp)
              content = `${user.username} is following `
              if(extraData && extraData.arrFollowing.length){
                extraData.arrFollowing.forEach((item, index) => {
                  if(index !== extraData.arrFollowing.length - 1){
                    content += (item.dataValues.username + ', ')
                  }
                  else{
                    content += item.dataValues.username
                  }
                })
              }
              else if(extraData && !extraData.arrFollowing.length){
                content = `${user.username} unfollows all`
              }
              break
            default:
              break
          }
          break
        default:
          break
      }
      // let content = JSON.parse(deData.params.content.toString('utf8'))
      return Posts.create({
        user_id: user.user_id,
        content: content,
        created_at: time,
        sequence: deData.sequence,
        hash: strHash
      }).then(() => {}).catch(e => console.log("ERROR CREATE POST", e))
    }
  }).catch(e => console.log("ERROR", e))
}

async function createComment(deData, interactData, contentBuf, time){
  let content = ''
  try{
    content = decodePost(contentBuf).text
  }
  catch(e){
    return
  }
  await createTransaction(deData, time)
  let user = await Users.findOne({
    where:{
      public_key: deData.account
    }
  }).catch(e => console.log("ERROR FIND", e))
  let other = await Users.findOne({
    where:{
      public_key: interactData.account
    }
  }).catch(e => console.log("ERROR FIND", e))
  let post = await Posts.findOne({
    where: {
      user_id: other.user_id,
      sequence: interactData.sequence
    }
  }).catch(e => console.log("ERROR FIND", e))

  if(post){
    await Comments.create({
      content: content,
      created_at: time,
      user_id: user.user_id,
      post_id: post.id
    })
  }
}

async function createReact(deData, interactData, contentBuf, time){
  let reaction = 0
  try{
    reaction = decodeReact(contentBuf).reaction
  }
  catch(e){
    return
  }
  await createTransaction(deData, time)
  let user = await Users.findOne({
    where:{
      public_key: deData.account
    }
  }).catch(e => console.log("ERROR FIND", e))

  let other = await Users.findOne({
    where:{
      public_key: interactData.account
    }
  }).catch(e => console.log("ERROR FIND", e))

  let post = await Posts.findOne({
    where: {
      user_id: other.user_id,
      sequence: interactData.sequence
    }
  }).catch(e => console.log("ERROR FIND", e))
  if(post){
    let exist = await Reacts.findOne({
      where:{
        post_id: post.id,
        user_id: user.user_id
      }
    }).catch(e => console.log("ERROR FIND", e))
    if(exist){
      Reacts.update({
        react: reaction
      },{
        where:{
          id: exist.id
        }
      }).catch(e => console.log("ERROR UPDATE REACTION", e))
    }
    else{
      await Reacts.create({
        react: reaction,
        user_id: user.user_id,
        post_id: post.id
      })
    }
  }
}
module.exports = db;
