module.exports = (sequelize, DataTypes) => {
    const transaction = sequelize.define('Transactions', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
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

    transaction.associate = (models) => {
      transaction.belongsTo(models.Users, {foreignKey: 'user_id'})
    }
    return transaction;
};
