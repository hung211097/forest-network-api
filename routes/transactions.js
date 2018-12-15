var express = require('express');
var router = express.Router();
var transactionRepos = require('../repos/transaction')

router.get('/', function(req, res, next) {
  let defaultQuery = {
    page: 1,
    limit: 10,
    order: null,
    type: null  //ASC / DESC
  };
  if(req.query){
    defaultQuery.page = req.query.page ? +req.query.page : defaultQuery.page
    defaultQuery.limit = req.query.limit ? +req.query.limit : defaultQuery.limit
    let order = req.query.order
    let type = req.query.type
    if(order &&
       (order === 'created_at' || order === 'amount'|| order === 'operation')){
      defaultQuery.order = order
    }
    if(type && (type.toUpperCase() === 'ASC' || type.toUpperCase() === 'DESC')){
      defaultQuery.type = type
    }
  }
  transactionRepos.getTransactions(defaultQuery).then((data) => {
    if(data){
     return res.status(200).json({
       length: data.length,
       transaction: data,
       status: 'success'
     })
   }
   return res.status(200).json({
     status: 'failed'
   })
  })
});

router.post('/conduct', function(req, res, next) {
  if(req.body && req.body.hex){
    transactionRepos.conductTransaction(req.body.hex).then((data) => {
      return res.status(200).json({
        status: data
      })
    })
  }
  else{
    return res.status(200).json({
      status: 'failed'
    })
  }
})

module.exports = router;
