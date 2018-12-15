module.exports = (req, res, next) => {
  if (req.session.isLogged === undefined) {
    req.session.isLogged = false;
  }

  if (req.session.public_key === undefined) {
    req.session.public_key = null;
  }

  res.locals.layoutVM = {
    isLogged: req.session.isLogged,
    publicKey: req.session.public_key,
  };
  next();
};
