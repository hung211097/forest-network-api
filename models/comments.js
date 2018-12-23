module.exports = (sequelize, DataTypes) => {
    const comments = sequelize.define('Comments', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      content: {type: DataTypes.TEXT, allowNull: false},
      created_at: {type: DataTypes.DATE, allowNull: false},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Comments',
      timestamps: false
    });

    comments.associate = (models) => {
      comments.belongsTo(models.Users, {foreignKey: 'user_id'})
      comments.belongsTo(models.Posts, {foreignKey: 'post_id'})
    }
    return comments;
};
