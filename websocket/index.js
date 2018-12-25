const db = require('../config/config');
const moment = require('moment');
const { RpcClient } = require('tendermint')
const transaction = require('../lib/transaction')
const { BANDWIDTH_PERIOD, MAX_CELLULOSE, NETWORK_BANDWIDTH } = require('../constants')
const websocket_url = require('../settingDev').node_url_websocket;
const node_url = require('../settingDev').node_url;
const { decodePost, decodeFollowing, decodeReact, decodeType } = require('../lib/transaction/v1')
const base32 = require('base32.js');
const chance = require('chance').Chance()

const Users = db.Users;
const Transactions = db.Transactions;
const Info = db.Info;
const Posts = db.Posts;
const Comments = db.Comments;
const Follows = db.Follows;

const fetch = RpcClient(node_url)
const FetchData = (newBlock) => {
  console.log("BEGIN ADD NEW DATA");
  let fromBlock = 0;
  let toBlock = +newBlock.header.height;

  Info.findAll().then((dataHeight) => {
    if(!dataHeight.length){
      Info.create({height: toBlock}).then(() => {}).catch(e => {console.log("ERROR INSERT HEIGHT", e)})
    }
    else{
      Info.update({height: toBlock}, {where: {height: dataHeight[0].height}}).then(() => {}).catch(e => {console.log("ERROR UPDATE HEIGHT", e)})
    }

    let query = []
    for(let i = dataHeight[0].height + 1; i <= toBlock; i++){
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
    FetchData(err.block)
    console.log(err)
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
              username: chance.name(),
              sequence: 0,
              bandwithTime: item.block.header.time,
              bandwithMax: 0,
              created_at: item.block.header.time
            })
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
            let hashData = await fetch.tx({hash: '0x' + deData.params.object})
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
        if(user.following && user.following.length && arrRes.length){
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
  let content = decodePost(contentBuf).text
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
  let reaction = decodeReact(contentBuf).reaction
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

module.exports = StartWebSocket;
