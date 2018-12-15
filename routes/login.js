var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')

router.post('/', function(req, res, next) {
  if(req.body && req.body.public_key){
    let key = req.body.public_key
    userRepos.getInfoUser(key).then((data) => {
      if(data){
        req.session.public_key = data.public_key
        req.session.isLogged = true
        return res.status(200).json({
          info_user: data,
          status: 'success'
        })
      }
      return res.status(200).json({
        status: 'failed'
      })
    })
  }
});

module.exports = router;
