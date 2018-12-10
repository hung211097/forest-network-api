const db = require('../config/config');
const user = db.user;

exports.getAllUser = () => {
    return user.findAll().then((users) => {
        return users;
    }).catch(e => {return null})
}
