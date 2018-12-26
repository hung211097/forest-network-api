module.exports = (sequelize, DataTypes) => {
    const transaction = sequelize.define('Transactions', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      public_key: {type: DataTypes.STRING, allowNull: false},
      public_key_received: {type: DataTypes.STRING, allowNull: true},
      object: {type: DataTypes.STRING, allowNull: true},
      created_at: {type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW},
      amount: {type: DataTypes.BIGINT, allowNull: false},
      operation: {type: DataTypes.STRING, allowNull: false},
      memo: {type: DataTypes.TEXT, allowNull: true}
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Transactions',
      timestamps: false
    });

    transaction.associate = (models) => {
      transaction.belongsTo(models.Users, {foreignKey: 'user_id'})
    }
    return transaction;
};
