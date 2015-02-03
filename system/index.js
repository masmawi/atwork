/**
 * Load dependencies
 */
var express = require('express');
var app = express();
var fs = require('fs');
var mongoose = require('mongoose');
var Config = require('./config/' + (process.env.NODE_ENV || 'development'));
var bodyParser = require('body-parser');
var multer = require('multer'); 

/**
 * Middleware
 */
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

/**
 * Path where modules are located
 */
var modulePath = __dirname + '/../modules';

/**
 * Create new server
 * @return {Void}
 */
function startServer() {
  var server = app.listen(Config.server.port, function() {
    var host = server.address().address
    var port = server.address().port

    console.log('AtWork running at http://%s:%s', host, port);
  });
}

/**
 * Connect to the database
 * @return {Object} Returns the connection object
 */
var dbConnect = function() {
  var db = mongoose.connect(Config.db);
  return db;
};

/**
 * Connect to the database
 * @return {Object} Returns the connection object
 */
var loadPlugins = function(startingPath, System) {
  var helpersPath = startingPath + '/helpers';
  if (!fs.existsSync(helpersPath)) {
    return false;
  }
  var files = fs.readdirSync(helpersPath); //not allowing subfolders for now inside 'helpers' folder
  files.forEach(function(file) {
    
    var plugin = require(helpersPath + '/' + file)(System);
    System.plugins[plugin.register.attributes.key] = plugin.register();
    console.log('Loaded plugin: ' + file);
  });
  return true;
};

/**
 * Load all files inside the models folder (mongoose models)
 * @param  {String} startingPath The starting path of the module
 * @return {Boolean}
 */
var loadDBModels = function(startingPath) {
  var modelsPath = startingPath + '/models';
  if (!fs.existsSync(modelsPath)) {
    return false;
  }
  var files = fs.readdirSync(modelsPath); //not allowing subfolders for now inside 'models' folder
  files.forEach(function(file) {
    require(modelsPath + '/' + file);
  });
  return true;
};

/**
 * Function to load all modules in the modules directory
 * @param  {Object}   System   The main system object
 * @param  {Function} callback The callback after loading all dependencies
 * @return {Void}
 */
var loadModules = function(System, callback) {
  fs.readdir(modulePath, function(err, list) {
    list.forEach(function(folder) {
      var folderPath = modulePath + '/' + folder;
      /**
       * Load needed db models
       */
      loadDBModels(folderPath);

      var moduleFile = folderPath + '/main.js';
      if (fs.existsSync(moduleFile)) {
        require(moduleFile)(System);
      }
    });
    callback();
  });
};

/**
 * Export the object
 * @type {Object}
 */
module.exports = {

  /**
   * Dynamically loaded plugins are accessible under plugins
   * @type {Object}
   */
  plugins: {},

  /**
   * Function to initialize the system and load all dependencies
   * @return {Void}
   */
  boot: function() {
    /**
     * Connect to database
     */
    dbConnect();

    /**
     * Load the helpers
     */
    loadPlugins(__dirname, this);
    
    /**
     * Finally, load dependencies and start the server
     */
    loadModules(this, function() {
      startServer();
    });
  },

  /**
   * Wrapping the server's route function 
   * @param  {Array} routes The array of routes
   * @return {Void}
   */
  route: function(routes) {
    routes.forEach(function(route) {
      app.route(route.path)[route.method](route.handler);
    });
  }

};