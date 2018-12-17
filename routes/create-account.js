var express = require('express');
var router = express.Router();
var createAccountRepos = require('../repos/create-account')

router.post('/', function(req, res, next) {
  if(req.body && req.body.hex){
    createAccountRepos.createAccount(req.body.hex).then(flag => {
      if(flag){
        return res.status(200).json({
          status: 'success'
        })
      }
      return res.status(200).json({
        status: 'failed'
      })
    })
  }
  else{
    return res.status(200).json({
      status: 'failed'
    })
  }
});

module.exports = router;
