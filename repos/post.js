const db = require('../config/config');
const user = db.Users;
const post = db.Posts;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

exports.getPosts = (query) => {
  return post.count().then((quantity) => {
    return post.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: query.order && query.type ? [[query.order, query.type]] : [],
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
        }
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
      }
    }).then((posts) => {
      return {
        posts: posts,
        total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
        total_item: quantity,
      }
    }).catch(e => {return null})
  }).catch(e => {return null})
}
