var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {
  req.session.destroy(function(err) {})
  return res.status(200).json({
    status: 'success'
  })
});

module.exports = router;
