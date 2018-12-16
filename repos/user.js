const db = require('../config/config');
const user = db.Users;
const publicKey = require('../settingDev').public_key;
const { BANDWIDTH_PERIOD, MAX_CELLULOSE, NETWORK_BANDWIDTH} = require('../constants')
const moment = require('moment')

exports.getUsers = (query) => {
    return user.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
    }).then((users) => {
        return users;
    }).catch(e => {return null})
}

exports.getInfoUser = (public_key) => {
    return user.findOne({
      where: {
        public_key: public_key
      }
    }).then((user) => {
        return user;
    }).catch(e => {return null})
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
