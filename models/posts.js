module.exports = (sequelize, DataTypes) => {
    const posts = sequelize.define('Posts', {
      id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
      content: {type: DataTypes.TEXT, allowNull: false},
      created_at: {type: DataTypes.DATE, allowNull: false},
      sequence: {type: DataTypes.INTEGER, allowNull: false},
      hash: {type: DataTypes.STRING, allowNull: false},
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
      tableName: 'Posts',
      timestamps: false
    });

    posts.associate = (models) => {
      posts.belongsTo(models.Users, {foreignKey: 'user_id'})
      posts.hasMany(models.Comments, {foreignKey: 'post_id'})
      posts.hasMany(models.Reacts, {foreignKey: 'post_id'})
    }
    return posts;
};
