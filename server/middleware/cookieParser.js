const parseCookies = (req, res, next) => {
  console.log('req', req);
  console.log('cookie', req.cookies);
  var cookies = JSON.parse(req.cookies);
  req.cookies = cookies;
};

module.exports = parseCookies;