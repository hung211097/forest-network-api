module.exports = (sequelize, DataTypes) => {
    const transaction = sequelize.define('Transactions', {
      public_key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      public_key_received: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      created_at: {type: DataTypes.DATE, allowNull: false, primaryKey: true, defaultValue: DataTypes.NOW},
      amount: {type: DataTypes.BIGINT, allowNull: false},
      operation: {type: DataTypes.STRING, allowNull: false},
      memo: {type: DataTypes.TEXT, allowNull: true}
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Transactions',
    });
    return transaction;
};
