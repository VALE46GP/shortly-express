const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser.js');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// mounting middleware
// app.use()

app.get('/', 
  (req, res) => {
    res.render('index');
  });

app.get('/login', 
  (req, res) => {
    res.render('login');
  });

app.get('/signup', 
  (req, res) => {
    res.render('signup');
  });

// app.get('/', 
//   (req, res) => {
//     res.render('index');
//   });

app.get('/create', 
  (req, res) => {
    res.render('index');
  });

app.get('/links', 
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/signup',
  (req, res, next) => {
    var url = req.body.url;
    return models.Users.create(req.body)
      .then(() => {
        res.redirect('/');
        res.status(201).send();
      })
      .error(error => {
        res.redirect('/signup');
        res.status(401).send(error);
      });
  });

app.post('/login',
  (req, res, next) => {
    var url = req.body.url;
    return models.Users.checkIfUserExists(req.body.username)
      .then((data) => {
        if (!data) {
          throw ('username does NOT exist');
        }
        if (!models.Users.compare(req.body.password, data.password, data.salt)) {
          throw ('password incorrect');
        }
        console.log('authentic');
        res.redirect('/');
        res.status(201).end();
      })
      .catch((error) => {
        console.log(error);
        res.redirect('/login');
        res.status(401).end();
      });
  });

app.post('/links', 
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
