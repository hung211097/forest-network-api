const db = require('../config/config');
const transaction = db.Transactions;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { RpcClient } = require('tendermint')
const node_url = require('../settingDev').node_url;

exports.getTransactions = (query) => {
    return transaction.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      attributes: ['public_key', 'public_key_received', 'created_at', 'amount', 'operation', 'memo']
    }).then((transactions) => {
        return transactions;
    }).catch(e => {return null})
}

exports.getTransactionsOfUser = (query, public_key) => {
    let result = null
    return transaction.count({
      where: {
        public_key: public_key
      }
    }).then((quantity) => {
      return transaction.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        attributes: ['public_key', 'public_key_received', 'created_at', 'amount', 'operation', 'memo'],
        where: {
          [Op.or]: [{public_key: public_key}, {public_key_received: public_key}],
        }
      }).then((transactions) => {
          return {
            total_page: quantity.length % query.limit === 0 ? quantity.length / query.limit : Math.floor(quantity.length / query.limit) + 1,
            total_item: quantity.length,
            transactions: transactions
          };
      }).catch(e => {return null})
    }).catch(e => {return null})
}

exports.conductTransaction = (hex) => {
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
