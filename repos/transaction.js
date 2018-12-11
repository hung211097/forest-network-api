const db = require('../config/config');
const transaction = db.transaction;

exports.getTransactions = (query) => {
    return transaction.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      attributes: ['public_key', 'public_key_received', 'created_at', 'amount', 'operation']
    }).then((transactions) => {
        return transactions;
    }).catch(e => {return null})
}
