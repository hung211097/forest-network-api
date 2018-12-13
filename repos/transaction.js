const db = require('../config/config');
const transaction = db.transaction;

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
    return transaction.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      attributes: ['public_key', 'public_key_received', 'created_at', 'amount', 'operation', 'memo'],
      where: {
        [Op.or]: [{public_key: public_key}, {public_key_received: public_key}]
      }
    }).then((transactions) => {
        return transactions;
    }).catch(e => {return null})
}
