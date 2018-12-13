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

exports.getInfoUser = (public_key) => {
    return user.findOne({
      where: {
        public_key: public_key
      }
    }).then((user) => {
        return user;
    }).catch(e => {return null})
}
