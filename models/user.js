module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define('Users', {
      user_id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      public_key: {type: DataTypes.STRING, allowNull: false},
      tendermint_address: {type: DataTypes.STRING, allowNull: true},
      username: {type: DataTypes.STRING, allowNull: false},
      sequence: {type: DataTypes.INTEGER, allowNull: false},
      amount: {type: DataTypes.BIGINT, allowNull: false, defaultValue: 0},
      bandwith: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 0},
      bandwithMax: {type: DataTypes.INTEGER, allowNull: false },
      bandwithTime: {type: DataTypes.DATE, allowNull: false }
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Users',
    });
    return user;
};
