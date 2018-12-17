var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')
var transactionRepos = require('../repos/transaction')

async function asyncForEach(array, obj, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(obj[array[index]], array[index]);
  }
}

async function pushCheckUpdate(arr, obj){
  await asyncForEach(Object.keys(obj), obj, async (hex, key) => {
    let flag = await userRepos.updateProfile(hex)
    arr.push({key: key, value: flag})
  })
}

/* GET users listing. */
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
       (order === 'username' || order === 'bandwithMax'|| order === 'user_id')){
      defaultQuery.order = order
    }
    if(type && (type.toUpperCase() === 'ASC' || type.toUpperCase() === 'DESC')){
      defaultQuery.type = type
    }
  }
  userRepos.getUsers(defaultQuery).then((data) => {
    if(data){
     return res.status(200).json({
       length: data.length,
       users: data,
       status: 'success'
     })
   }
   return res.status(200).json({
     status: 'failed'
   })
  })
});

router.post('/update-profile', async function(req, res, next) {
  if(req.body && req.body.data){
    let arrRes = []
    await pushCheckUpdate(arrRes, req.body.data)
    return res.status(200).json({
      result: arrRes,
      status: 'success'
    })
  }
  return res.status(200).json({
    status: 'failed'
  })
});

router.get('/me', function(req, res, next) {
  if(req.session && req.session.public_key && req.session.isLogged){
    userRepos.getInfoUser(req.session.public_key).then((data) => {
      return res.status(200).json({
        info_user: data,
        status: 'success'
      })
    }).catch(() => {
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

router.get('/id/:public_key', function(req, res, next) {
  let key = req.params.public_key
  userRepos.getInfoUser(key).then((data) => {
    if(data){
      return res.status(200).json({
        info_user: data,
        status: 'success'
      })
    }
    return res.status(200).json({
      status: 'failed'
    })
  })
});


router.get('/transactions', function(req, res, next) {
  let key = req.session.public_key
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
       length: data.transactions.length,
       transactions: data.transactions,
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
