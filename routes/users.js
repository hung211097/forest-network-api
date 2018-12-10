var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')

/* GET users listing. */
router.get('/', function(req, res, next) {
  userRepos.getAllUser().then((data) => {
    if(data){
     return res.status(200).json({
       length: data.length,
       users: data
     })
   }
   return res.status(404)
  })
});

module.exports = router;
