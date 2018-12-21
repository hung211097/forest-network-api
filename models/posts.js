module.exports = (sequelize, DataTypes) => {
    const posts = sequelize.define('Posts', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      content: {type: DataTypes.TEXT, allowNull: false},
      likes: {type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: true, defaultValue: []},
      created_at: {type: DataTypes.DATE, allowNull: false},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Posts',
    });

    posts.associate = (models) => {
      posts.belongsTo(models.Users, {foreignKey: 'user_id'})
      posts.hasMany(models.Comments, {foreignKey: 'post_id'})
    }
    return posts;
};
