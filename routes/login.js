var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')

router.post('/', function(req, res, next) {
  if(req.body && req.body.data){
    let key = req.body.data.public_key
    userRepos.getInfoUser(key).then((data) => {
      if(data){
        req.session.data = data
        return res.status(200).json({
          infoUser: data
        })
      }
      return res.status(404)
    })
  }
});

module.exports = router;
