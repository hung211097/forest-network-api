const { RpcClient } = require('tendermint')
const node_url = require('../settingDev').node_url;

exports.createAccount = (hex) => {
    const client = RpcClient(node_url)
    return client.broadcastTxCommit({tx: hex}).then((data) => {
      if(+data.height !== 0){
        return true
      }
      return false
    })
}
