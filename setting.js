const setting = {
  databaseConfig: {
    uri: 'postgres://iifhpxkmqnbpaj:48ee3d919d9db142d338858177f0ababd5abdbaaddd239f155d0a47ba38da1d8@ec2-54-225-196-122.compute-1.amazonaws.com:5432/dfj5sv7225f40q',
    database: 'dfj5sv7225f40q',
    username: 'iifhpxkmqnbpaj',
    password: '48ee3d919d9db142d338858177f0ababd5abdbaaddd239f155d0a47ba38da1d8',
    host: 'ec2-54-225-196-122.compute-1.amazonaws.com',
    port: 5432,
    dialect: 'postgres',
    operatorsAliases: false,
    protocol: 'postgres',
    dialectOptions: {
        ssl: true
    },
  },
  public_key: "GBIDPG4BFSTJSR3TYPJG4S4R2MEZX6U6FK5YJVIGD4ZJ3LTM4B5IS4RB",
  private_key: "SB5YAIOBU72LC4PTYTEUJOKCN4LWEQDPKKFRQ6NRQMXRG42TMURPRZNA",
  node_url: "https://komodo.forest.network:443",
  node_url_websocket: "wss://komodo.forest.network:443"
}
module.exports = setting;
