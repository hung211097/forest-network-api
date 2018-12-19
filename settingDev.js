const setting = {
  databaseConfig: {
    uri: '',
    database: 'forestnetwork',
    username: 'postgres',
    password: 'chisidotoji',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    operatorsAliases: false,
    protocol: 'postgres'
  },
  node_url: "https://komodo.forest.network:443",
  node_url_websocket: "wss://komodo.forest.network:443"
}
module.exports = setting;
