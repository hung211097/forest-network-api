var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // req.session.data = {isLogged: true, publicKey: "GBIDPG4BFSTJSR3TYPJG4S4R2MEZX6U6FK5YJVIGD4ZJ3LTM4B5IS4RB"}
  res.render('index', { title: 'Express' });
});

module.exports = router;
