var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')

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

module.exports = router;
