const vstruct = require('varstruct');
const crypto = require('crypto');
const { Keypair } = require('stellar-base');
const v1 = require('./v1');

const Transaction = vstruct([
  { name: 'version', type: vstruct.UInt8 },
]);

function encode(tx) {
  switch (tx.version) {
    case 1:
      return v1.encode(tx);

    default:
      throw Error('Unsupport version');
  };
}

function decode(data) {
  const versionTx = Transaction.decode(data);
  switch (versionTx.version) {
    case 1:
      return v1.decode(data);
      break;

    default:
      throw Error('Unsupport version');
  }
}

function getUnsignedHash(tx) {
  return crypto
    .createHash('sha256')
    .update(encode({
      ...tx,
      signature: Buffer.alloc(64, 0),
    }))
    .digest();
}

function sign(tx, secret) {
  const key = Keypair.fromSecret(secret);
  tx.signature = key.sign(getUnsignedHash(tx));
}

function verify(tx) {
  const key = Keypair.fromPublicKey(tx.account);
  return key.verify(getUnsignedHash(tx), tx.signature);
}

function hash(tx) {
  return tx.hash = crypto.createHash('sha256')
    .update(encode(tx))
    .digest()
    .slice(0, 20)
    .toString('hex')
    .toUpperCase();
}

// const buf = Buffer.from("ATBQN5uBLKaZR3PD0m5LkdMJm/qeKruE1QYfMp2ubOB6iXIhAAAAAAAAAAEAAgArMHEIOzCyBuDrGvkgokpFcOvt22DuDYRI3FIVLuUeg6uVjFgAAAAAAAAAZHpbkRMFAfdCoTnute3wiidFx7y7pGzy1GcoIQQrzV4MUOqAs7QFwAf+W0U60GZG4A3jGhsmYa/hFWu1KkwdwwI=", 'base64')
// const buf = Buffer.from("ATAdxPY3gelauaEcMyjMIuaJsiFe9bIO5kZTCil6jcMzJAwoAAAAAAAAADEQQ1RUNTIyLUNRMjAxNS8zMgIAKzBQN5uBLKaZR3PD0m5LkdMJm/qeKruE1QYfMp2ubOB6iXIhAAAAAAX14QDNCp69ZgNrE4d+9uO11jS3tueuuNpndi2zXc9H4GrDiOUnx5L3bBoMwXRezDcs8G1s4r1ywJTQnv1+Vae97xUM", 'base64')
// const buf = Buffer.from("ATBQN5uBLKaZR3PD0m5LkdMJm/qeKruE1QYfMp2ubOB6iXIhAAAAAAAAAAIAAQAjMMPn7aRD74pea3O+wWGKDXiySOf6hPMkeBm+Aq5j/B1EGinl1AUDlknW1hglnjbPMcFFy6xHpl89o6wwFpe5+2EUS2X/7uqh74Hp9RnYTklB7iU2ZYu/YM0epxZ3Js6u2zQN", 'base64')
// const deData = decode(buf)
// console.log(deData);
module.exports = { encode, decode, verify, sign, hash };
