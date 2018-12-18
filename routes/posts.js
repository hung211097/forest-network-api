var express = require('express');
var router = express.Router();
var postRepos = require('../repos/post')
var transactionRepos = require('../repos/transaction')
var userRepos = require('../repos/user')
const transaction = require('../lib/transaction/index')

router.post('/', function(req, res, next) {
  if(req.body && req.body.tx){
		console.log('account1', req.body.tx)
    let TxEncode = '0x' + transaction.encode(req.body.tx).toString('hex');
				console.log('account2')
				console.log(req.body.tx.account)
    userRepos.checkIfEnoughOXY(req.body.tx.account, transaction.encode(req.body.tx).toString('base64'), new Date()).then((flag) => {
      if(flag){				
				console.log('tx', req.body.tx)
				transactionRepos.conductTransaction(TxEncode).then((data) => {
					return res.status(200).json({
						status: 'success'
					})
				})
			}
      else{
				console.log('fail')
        return res.status(200).json({
          status: 'failed'
        })
      }
    }).catch(e => console.log(e))
  }
});

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
       (order === 'created_at' || order === 'user_id')){
      defaultQuery.order = order
    }
    if(type && (type.toUpperCase() === 'ASC' || type.toUpperCase() === 'DESC')){
      defaultQuery.type = type
    }
  }
  postRepos.getPosts(defaultQuery).then((data) => {
    if(data){
      return res.status(200).json({
        length: data.length,
        posts: data.posts,
        total_page: data.total_page,
        total_item: data.total_item,
        status: 'success'
      })
    }
    return res.status(200).json({
      status: 'failed'
    })
  })
});

module.exports = router;
