const db = require('../config/config');
const user = db.user;

exports.getUsers = (query) => {
    return user.findAll({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }).then((users) => {
        return users;
    }).catch(e => {return null})
}
