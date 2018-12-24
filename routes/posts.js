var express = require('express');
var router = express.Router();
var postRepos = require('../repos/post')
var transactionRepos = require('../repos/transaction')

router.post('/', function(req, res, next) {
  if(req.body && req.body.TxEncode){
    transactionRepos.conductTransaction(req.body.TxEncode).then((data) => {
      return res.status(200).json({
        status: 'success'
      })
    })
  }
  else{
    return res.status(200).json({
      status: 'failed'
    })
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

router.get('/:id/comments', function(req, res, next) {
  let post_id = req.params.id
  let defaultQuery = {
    page: 1,
    limit: 10,
    order: 'created_at',
    type: 'DESC'  //ASC / DESC
  };
  if(req.query){
    defaultQuery.page = req.query.page ? +req.query.page : defaultQuery.page
    defaultQuery.limit = req.query.limit ? +req.query.limit : defaultQuery.limit
    let order = req.query.order
    let type = req.query.type
    if(order &&
       (order === 'created_at')){
      defaultQuery.order = order
    }
    if(type && (type.toUpperCase() === 'ASC' || type.toUpperCase() === 'DESC')){
      defaultQuery.type = type
    }
  }
  postRepos.getComments(defaultQuery, post_id).then((data) => {
    if(data){
      return res.status(200).json({
        length: data.length,
        comments: data.comments,
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

router.get('/:id/reacts', function(req, res, next) {
  let post_id = req.params.id
  postRepos.getReacts(post_id, req.session.user_id).then((data) => {
    if(data){
      return res.status(200).json({
        your_react: data.your_react,
        total_reacts: data.total_reacts,
        status: 'success'
      })
    }
    return res.status(200).json({
      status: 'failed'
    })
  })
});

router.get('/:id/hash', function(req, res, next) {
  let post_id = req.params.id
  postRepos.getHashPost(post_id).then((data) => {
    if(data){
      return res.status(200).json({
        hash: data.hash,
        status: 'success'
      })
    }
    return res.status(200).json({
      status: 'failed'
    })
  })
});

router.post('/createcomment', function(req, res, next) {
  if(req.body && req.body.TxEncode){
    transactionRepos.conductTransaction(req.body.TxEncode).then((data) => {
      return res.status(200).json({
        status: 'success'
      })
    })
  }
  else{
    return res.status(200).json({
      status: 'failed'
    })
  }
});

router.post('/createreact', function(req, res, next) {
  if(req.body && req.body.TxEncode){
    transactionRepos.conductTransaction(req.body.TxEncode).then((data) => {
      return res.status(200).json({
        status: 'success'
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
