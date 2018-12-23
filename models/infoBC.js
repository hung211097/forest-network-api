module.exports = (sequelize, DataTypes) => {
    const info = sequelize.define('Blockchains', {
      height: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Blockchains',
      timestamps: false
    });
    return info;
};
