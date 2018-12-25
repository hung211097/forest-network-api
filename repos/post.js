const db = require('../config/config');
const user = db.Users;
const post = db.Posts;
const comment = db.Comments;
const react = db.Reacts;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { RpcClient } = require('tendermint')
const node_url = require('../settingDev').node_url;

exports.createPost = (hex) => {
  const client = RpcClient(node_url)
  return client.broadcastTxCommit({tx: hex}).then((res) => {
    if(+res.height !== 0){
      return 'success'
    }
    return 'failed'
  })
  .catch(e => {
    return 'failed'
  })
}

exports.getPosts = (query) => {
  return post.count().then((quantity) => {
    return post.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      include: [{
        model: user,
        attributes: ['username', 'user_id', 'avatar']
      }]
    }).then((data) => {
      return {
        posts: data,
        total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
        total_item: quantity,
      }
    }).catch(e => {return null})
  })
}

exports.getPostsWall = (query, user_id) => {
  return user.findOne({
    where:{
      user_id: user_id
    },
  }).then((data) => {
    let arrUserID = data.following.slice()
    arrUserID.push(+data.user_id)
    return post.count({
      where:{
        user_id: arrUserID
      }
    }).then((quantity) => {
      return post.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        where:{
          user_id: arrUserID
        },
        include: [{
          model: user,
          attributes: ['username', 'user_id', 'avatar']
        }],
      }).then((posts) => {

        return {
          posts: posts,
          total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
          total_item: quantity,
        }
      }).catch(e => {return null})
    }).catch(e => {return null})
  }).catch(e => {return null})
}

exports.getMyPosts = (query, user_id) => {
  return post.count({
    where:{
      user_id: user_id
    }
  }).then((quantity) => {
    return post.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      where:{
        user_id: user_id
      },
      include: [{
        model: user,
        attributes: ['username', 'user_id', 'avatar']
      }]
    }).then((posts) => {
      return {
        posts: posts,
        total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
        total_item: quantity,
      }
    }).catch(e => {return null})
  }).catch(e => {return null})
}

exports.getComments = (query, post_id) => {
  return comment.count({
    where:{
      post_id: post_id
    }
  }).then((quantity) => {
    return comment.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
      where:{
        post_id: post_id
      },
      include: [{
        model: user,
        attributes: ['username', 'user_id', 'avatar']
      }]
    }).then((comments) => {
      return {
        comments: comments,
        total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
        total_item: quantity,
      }
    }).catch(e => {return null})
  }).catch(e => {return null})
}

exports.getReacts = (post_id, user_id) => {
  return react.count({
    where:{
      post_id: post_id
    }
  }).then((quantity) => {
    return react.findOne({
      where:{
        user_id: user_id,
        post_id: post_id
      },
    }).then((reacts) => {
      return {
        your_react: reacts ? reacts.dataValues.react : 0,
        total_reacts: quantity,
      }
    }).catch(e => {return null})
  }).catch(e => {return null})
}

exports.getHashPost = (post_id) => {
  return post.findOne({
    where:{
      id: post_id
    }
  }).then((post) => {
    return {hash: post.hash}
  }).catch(e => {return null})
}
