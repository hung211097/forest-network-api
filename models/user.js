module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define('Users', {
      userID: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true},
      username: {type: DataTypes.STRING, allowNull: false},
      password: {type: DataTypes.STRING, allowNull: false}
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Users',
    });
    return user;
};
