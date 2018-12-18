var express = require('express');
var router = express.Router();
var followRepos = require('../repos/follow')

router.post('/', function(req, res, next) {
  if(req.body && req.body.hex){
    followRepos.followUsers(hex).then((flag) => {
      return res.status(200).json({
        status: flag
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
