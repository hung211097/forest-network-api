module.exports = (sequelize, DataTypes) => {
    const transaction = sequelize.define('Transactions', {
      public_key: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      public_key_received: {type: DataTypes.STRING, allowNull: false, primaryKey: true},
      created_at: {type: Sequelize.DATE, allowNull: false, primaryKey: true, defaultValue: Sequelize.NOW},
      amount: {type: DataTypes.INTEGER, allowNull: false},
      tendermint_address: {type: DataTypes.STRING, allowNull: true},
      username: {type: DataTypes.STRING, allowNull: false}
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Transactions',
    });
    return transaction;
};
