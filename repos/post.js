const db = require('../config/config');
const user = db.Users;
const post = db.Posts;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

exports.getUsers = (query, exceptID) => {
    return user.count({
      where: {
        user_id: {
          [Op.ne]: exceptID
        }
      }
    }).then((quantity) => {
      return user.findAll({
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        order: query.order && query.type ? [[query.order, query.type]] : [],
        where: {
          user_id: {
            [Op.ne]: exceptID
          }
        }
      }).then((users) => {
        return {
          users: users,
          total_page: quantity % query.limit === 0 ? quantity / query.limit : Math.floor(quantity / query.limit) + 1,
          total_item: quantity,
        };
      }).catch(e => {return null})
    })
}
