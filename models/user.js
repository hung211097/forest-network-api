module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define('Users', {
      public_key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      tendermint_address: {type: DataTypes.STRING, allowNull: true},
      username: {type: DataTypes.STRING, allowNull: false},
      sequence: {type: DataTypes.INTEGER, allowNull: false},
      amount: {type: DataTypes.BIGINT, allowNull: false, defaultValue: 0},
      bandwith: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
      bandwithTime: {type: DataTypes.DATE, allowNull: true }
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Users',
    });
    return user;
};
