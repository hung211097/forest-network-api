const db = require('../config/config');
const user = db.Users;
const { BANDWIDTH_PERIOD, MAX_CELLULOSE, NETWORK_BANDWIDTH} = require('../constants')
const moment = require('moment')
const { RpcClient } = require('tendermint')
const node_url = require('../settingDev').node_url;
const full_url = require('../settingDev').node_full_url;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const axios = require('axios');
const querystring = require('querystring')

exports.getUsers = (query, exceptID) => {
    return user.count({
      where: {
        user_id: {
          [Op.ne]: exceptID
        }
      }
    }).then((quantity) => {
      return user.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        where: {
          user_id: {
            [Op.ne]: exceptID
          }
        }
      }).then((users) => {
        return {
          users: users,
          total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
          total_item: quantity,
        };
      }).catch(e => {return null})
    })
}

exports.getUsersFollowing = (query, user_id) => {
    return user.findOne({
      where:{
        user_id: user_id
      }
    }).then((data) => {
      if(!data.following.length){
        return {
          users: [],
          total_page: 0,
          total_item: 0
        }
      }
      return user.count({
        where: {
          user_id: {
            [Op.in]: data.following,
          }
        }
      }).then((quantity) => {
        return user.findAll({
          limit: query.limit,
          offset: (query.page - 1) * query.limit,
          order: query.order && query.type ? [[query.order, query.type]] : [],
          where: {
            user_id: {
              [Op.in]: data.following,
            }
          }
        }).then((users) => {
          return {
            users: users,
            total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
            total_item: quantity,
          };
        }).catch(e => {return null})
      })
    }).catch(e => {return null})
}

exports.getUsersFollower = (query, user_id) => {
  return user.findOne({
    where:{
      user_id: user_id
    }
  }).then((data) => {
    if(!data.follower.length){
      return {
        users: [],
        total_page: 0,
        total_item: 0
      }
    }
    return user.count({
      where: {
        user_id:{
          [Op.in]: data.follower,
        }
      }
    }).then((quantity) => {
      return user.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        where: {
          user_id:{
            [Op.in]: data.follower,
          }
        }
      }).then((users) => {
        return {
          users: users,
          total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
          total_item: quantity,
        };
      }).catch(e => {return null})
    })
  }).catch(e => {return null})
}

exports.getInfoUserByID = (user_id) => {
    return user.findOne({
      where: {
        user_id: user_id
      }
    }).then((user) => {
        return user;
    }).catch(e => {return null})
}

exports.getInfoUserByPubkey = (public_key) => {
    return user.findOne({
      where: {
        public_key: public_key
      }
    }).then((user) => {
        return user;
    }).catch(e => {return null})
}

exports.getUnfollowedUsers = (query, user_id) => {
  return user.findOne({
    where:{
      user_id: user_id
    }
  }).then((data) => {
    data.following.push(+user_id)
    return user.count({
      where: {
        user_id: {
          [Op.notIn]: data.following
        }
      }
    }).then((quantity) => {
      return user.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        where: {
          user_id: {
            [Op.notIn]: data.following
          }
        }
      }).then((users) => {
        return {
          users: users,
          total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
          total_item: quantity,
        };
      }).catch(e => {return null})
    })
  }).catch(e => {return null})
}

exports.updateProfile = (key, hex) => {
  if(key === 'hexImage'){
    return axios.post(full_url + '/broadcast_tx_commit',
    querystring.stringify({tx: hex}),
    {headers: { 'content-type': 'application/x-www-form-urlencoded' }}).then((res) => {
      if(+res.data.result.height){
        return 'success'
      }
      return 'failed'
    })
  }
  else{
    const client = RpcClient(node_url)
    return client.broadcastTxCommit({tx: hex}).then((res) => {
      if(+res.height !== 0){
        return 'success'
      }
      return 'failed'
    }).catch(e => {
      return 'failed'
    })
  }
}

exports.getPublickeyFollowings = (user_id, arr) => {
  return user.findAll({
    where:{
      user_id: arr
    },
    attributes: ['public_key']
  }).then((pubkeys) => {
    return pubkeys
  }).catch(e => {return []})
}

exports.checkIfEnoughOXY = (publicKey, txString64, timeNewTransaction) => {
    return user.findOne({
      where: {
        public_key: publicKey
      }
    }).then((account) => {
      const txSize = Buffer.from(txString64, 'base64').length
      const currentTime = timeNewTransaction
      let diff = BANDWIDTH_PERIOD
      if(account.bandwithTime && account.sequence !== 1){
        if(moment(currentTime).unix() - moment(account.bandwithTime).unix() < BANDWIDTH_PERIOD){
          diff = moment(currentTime).unix() - moment(account.bandwithTime).unix()
        }
      }
      const bandwidthLimit = Math.floor(account.amount / MAX_CELLULOSE * NETWORK_BANDWIDTH)
      const bandwidthConsume = Math.ceil(Math.max(0, (BANDWIDTH_PERIOD - diff) / BANDWIDTH_PERIOD) * account.bandwith + txSize)

      if (bandwidthConsume > bandwidthLimit) {
        return false
      }
      return true
    }).catch(e => console.log("ERROR FIND USER", e))
}

exports.getUsersByUsername = (username) => {
  return user.findOne({
    where: {
      username: {
        [Op.eq]: username
      }
    }
  }).then((user) => {
      return {
        user: user,
      };
    }).catch(e => {return null})
}