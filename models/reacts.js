module.exports = (sequelize, DataTypes) => {
    const react = sequelize.define('Reacts', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      react: {type: DataTypes.INTEGER, allowNull: true, defaultValue: 0},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Reacts',
      timestamps: false
    });

    react.associate = (models) => {
      react.belongsTo(models.Users, {foreignKey: 'user_id'})
      react.belongsTo(models.Posts, {foreignKey: 'post_id'})
    }
    return react;
};
