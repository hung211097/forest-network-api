module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define('Users', {
      user_id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      public_key: {type: DataTypes.STRING, allowNull: false},
      username: {type: DataTypes.STRING, allowNull: false},
      avatar: {type: DataTypes.TEXT, allowNull: true},
      sequence: {type: DataTypes.INTEGER, allowNull: false},
      amount: {type: DataTypes.BIGINT, allowNull: false, defaultValue: 0},
      following: {type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true, defaultValue: []},
      follower: {type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true, defaultValue: []},
      bandwith: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
      bandwithMax: {type: DataTypes.INTEGER, allowNull: false },
      bandwithTime: {type: DataTypes.DATE, allowNull: false }
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Users',
    });

    user.associate = (models) => {
      user.hasMany(models.Transactions, {foreignKey: 'user_id'})
      user.hasMany(models.Posts, {foreignKey: 'user_id'})
      user.hasMany(models.Comments, {foreignKey: 'user_id'})
    }
    return user;
};
