module.exports = (sequelize, DataTypes) => {
    const follows = sequelize.define('Follows', {
      public_key_follower: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      public_key_following: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Follows',
    });

    return follows;
};
