var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')
const { Keypair } = require('stellar-base');
const { createHash } = require('crypto')
const transaction = require('../lib/transaction/index')
const { RpcClient } = require('tendermint')
const private = require('../settingDev').private_key;
const public_me = require('../settingDev').public_key;

router.post('/', function(req, res, next) {
  const key = Keypair.random();
  const client = RpcClient('https://komodo.forest.network:443')
  let result = {
    secret_key: key.secret(),
    public_key: key.publicKey(),
    secret_key_base64: key._secretKey.toString('base64'),
    public_key_base64: key._publicKey.toString('base64'),
    tendermint_address: createHash('sha256').update(key._publicKey).digest().slice(0, 20).toString('hex').toUpperCase()
  }
  userRepos.getInfoUser(public_me).then((info) => {
    const tx = {
      version: 1,
      sequence: info.sequence + 5,
      memo: Buffer.alloc(0),
      account: public_me,
      operation: "create_account",
      params: {
        address: key.publicKey(),
      },
      signature: new Buffer(64)
    }

    transaction.sign(tx, private);
    let TxEncode = '0x' + transaction.encode(tx).toString('hex');
    userRepos.checkIfEnoughOXY(public_me, transaction.encode(tx).toString('base64'), new Date()).then((flag) => {
      if(flag){
        client.broadcastTxCommit({tx: TxEncode}).then((data) => {
          if(+data.height !== 0){
            return res.status(200).json({
              keypair: result,
              status: 'success'
            })
          }
          return res.status(200).json({
            status: 'failed'
          })
        })
      }
      else{
        return res.status(200).json({
          status: 'failed'
        })
      }
    }).catch(e => console.log(e))
  }).catch(e => console.log("ERROR", e))
});

module.exports = router;
