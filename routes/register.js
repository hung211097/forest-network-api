var express = require('express');
var router = express.Router();
var userRepos = require('../repos/user')
const { Keypair } = require('stellar-base');
const { createHash } = require('crypto')

router.post('/', function(req, res, next) {
  const key = Keypair.random();
  let result = {
    secret_key: key.secret(),
    public_key: key.publicKey(),
    secret_key_base64: key._secretKey.toString('base64'),
    public_key_base64: key._publicKey.toString('base64'),
    tendermint_address: createHash('sha256').update(key._publicKey).digest().slice(0, 20).toString('hex').toUpperCase()
  }
  return res.status(200).json({
    keypair: result
  })
});

module.exports = router;
