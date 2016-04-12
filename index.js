var os = require("os");
var fs = require("fs");
var express = require("express");
var app = express();
var cluster = require("cluster");
var sticky = require("sticky-session");
var session = require("express-session");
var formidable = require('express-formidable');
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var mongoStore = require("connect-mongo")(session);
var path = require("path");
var http = require("http").Server(app);
var _ = require("underscore");
var async = require("async");
var uuid = require('node-uuid');
var streamifier = require("streamifier");
var Encryption = require("./libs/Encryption.js");
var ImageHandler = require("./libs/ImageHandler.js");
var Audit = require("./libs/Audit.js");
var ChildProcesses = require("./libs/ChildProcesses.js");
var RouteHandler = require("./libs/RouteHandler.js");
var FileHandler = require("./libs/FileHandler.js");
var InitHandler = require("./libs/InitHandler.js");
var ImageHandler = require("./libs/ImageHandler.js");
var FileArchiver = require("./libs/FileArchiver.js");
var config = require("./libs/config.js");
var log = require("bunyan").createLogger(config.logger.options());
var Object = require("./public/js/Object_prototypes.js");

try {
  if (config.server.CLUSTERING) {
    if (!sticky.listen(http,config.server.PORT)) {
      http.once("listening",function() {log.info("listening on *:"+config.server.PORT);});
      
      // Count CPUs
      var cpuCount = os.cpus().length;
      
      // Create a worker for each CPU
      for (var _i=0;_i<cpuCount;_i++) {
        cluster.fork();
      }
      
      // Listen for dying workers
      cluster.on("exit", function (worker) {
        // Replace the dead worker
        log.info("Worker " + worker.id + " died. Creating another worker...");
        cluster.fork();
      });
    } else {
      main();
    }
  } else {
    main(true);
  }
  
} catch (_err) {
  log.error(_err);
}


//FUNCTIONS
function main(notClustering) {
  async.series([
    function(callback) {
      config.mongodb.initialize(function(err,options) {
        callback(err,options);
      });
    },
    function(callback) {
      //go get all the routes available for express to serve and bind
      //them to listeners, then get all the links we'll need for the header
      //header navigation bar, then initialize web server
      new RouteHandler().update(function(err) {
        callback(err);
      });
    },
    function(callback) {
      new InitHandler().initQueries(function(err,data) {
        callback(err,data);
      });
    }
  ],
    function(err,results) {
      if (err) return log.error(err);
      
      //var options = results[0];
      var queries = results[2].queries;
      var oData = results[2].oData;
      
      //view engine setup
      app.set("views", path.join(__dirname, "views"));
      app.set("view engine", "jade");
      
      app.use(bodyParser.urlencoded({extended:true, limit:"50mb"}));
      app.use(bodyParser.json({limit:"50mb"}));
      app.use(formidable.parse());
      app.use(cookieParser(config.session.sessionSecret));
      
      var sessionMiddleware=session({
        store: new mongoStore(config.session.storeOptions()),
        secret: config.session.sessionSecret,
        key: config.session.sessionCookieKey,
        resave: true,
        saveUninitialized: true
        //cookie: { secure: true }
      });
      
      app.use(sessionMiddleware);
      
      //static files
      app.use("/public",express.static(path.join(__dirname,"/public")));
      
      //if any of the queries stored in the DB have extra code we need to eval(), do that here
      _.each(queries,function(queryInfo) {
        if (queryInfo.extracode) {
          try {
            eval(queryInfo.extracode);
          } catch(err) {
            log.error(err);
          }
        }
      });
      
      //setup route handlers in the express app
      _.each(oData.routes,function(route) {
        try {
          app[route.verb.toLowerCase()](route.path,eval(route.callback));
        } catch(err) {
          log.error("Error binding route to express; method: " + route.verb + "; path: " + route.path,err);
        }
      });
      
      //starts the web server listening on specified port
      //if we're not clustered
      if (notClustering) {
        http.listen(config.server.PORT, function(){
          log.info("listening on *:"+config.server.PORT);
        });
      }
    }
  );
}