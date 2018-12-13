var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')
var transactionRepos = require('../repos/transaction')

/* GET users listing. */
router.get('/', function(req, res, next) {
  let defaultQuery = {
    page: 1,
    limit: 10,
  };
  if(req.query){
    defaultQuery.page = req.query.page ? +req.query.page : defaultQuery.page
    defaultQuery.limit = req.query.limit ? +req.query.limit : defaultQuery.limit
  }
  userRepos.getUsers(defaultQuery).then((data) => {
    if(data){
     return res.status(200).json({
       length: data.length,
       users: data
     })
   }
   return res.status(404)
  })
});

router.get('/:public_key', function(req, res, next) {
  let key = req.params.public_key
  if(req.session.data && req.session.data.public_key === key){
    return req.session.data
  }
  return res.status(404)
});

router.get('/:public_key/transactions', function(req, res, next) {
  let key = req.params.public_key

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
  transactionRepos.getTransactionsOfUser(defaultQuery, key).then((data) => {
    if(data){
     return res.status(200).json({
       length: data.length,
       transaction: data
     })
   }
   return res.status(404)
  })
});
module.exports = router;
