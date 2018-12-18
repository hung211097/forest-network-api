var express = require('express');
var router = express.Router();
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

module.exports = router;
