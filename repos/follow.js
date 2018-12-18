const { RpcClient } = require('tendermint')
const node_url = require('../settingDev').node_url;

exports.followUsers = (hex) => {
    const client = RpcClient(node_url)
    return client.broadcastTxCommit({tx: hex}).then((res) => {
      if(+res.height !== 0){
        return 'success'
      }
      return 'failed'
    }).catch(e => {
      return 'failed'
    })
}
