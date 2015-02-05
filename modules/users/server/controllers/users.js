var mongoose = require('mongoose');
var User = mongoose.model('User');
var jwt = require('jsonwebtoken');

module.exports = function(System) {
  var obj = {};
  var json = System.plugins.JSON;

  obj.create = function(req, res) {

    var user = new User(req.body);
    user.provider = 'local';
    user.roles = ['authenticated'];
    user.token = jwt.sign(user, System.config.secret);

    user.save(function(err) {
      if (err) {
        return json.unhappy(err, res);
      }
      return json.happy(user, res);
    });
  };
  
  obj.authenticate = function(req, res) {
    User.findOne({email: req.body.email}, function(err, user) {
      if (err) {
        json.unhappy(err, res);
      } else {
        if (user && user.hashPassword(req.body.password) === user.hashed_password) {
          json.happy({
            record: user
          }, res);
        } else {
          json.unhappy({
            message: 'Incorrect email/password'
          }, res);
        }
      }
    });
  };

  obj.me = function(req, res) {
    if (req.user) {
      json.happy({
        record: req.user
      }, res);
    }
  };

  return obj;
};