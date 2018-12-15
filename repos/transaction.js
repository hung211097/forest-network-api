const db = require('../config/config');
const transaction = db.transaction;
// const Sequelize = require('sequelize');
// const Op = Sequelize.Op;
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
    return transaction.findAll({
      where: {
        public_key: public_key
      }
    }).then((allData) => {
      return transaction.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        attributes: ['public_key', 'public_key_received', 'created_at', 'amount', 'operation', 'memo'],
        where: {
          public_key: public_key
        }
      }).then((transactions) => {
          return {
            total_page: allData.length % query.limit === 0 ? allData.length / query.limit : Math.floor(allData.length / query.limit) + 1,
            total_item: allData.length,
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
