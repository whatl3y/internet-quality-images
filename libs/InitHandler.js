var async = require("async");
var CodeRunner = require("./CodeRunner.js");
var config = require('./config.js');
var Object = require("../public/js/Object_prototypes.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    InitHandler.js
|PURPOSE:  Handles all things to do with getting information about a wiki page.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  mongodb native driver in nodejs
|REVISION HISTORY:  
|      *LJW 1/28/2016 - created
-----------------------------------------------------------------------------------------*/
InitHandler=function(options) {
  options = options || {};
  
  this.sanitizePath(options.path);
}

/*-----------------------------------------------------------------------------------------
|NAME:      initQueries (PUBLIC)
|DESCRIPTION:  When we start the wiki server, there are initial queries we run to execute code and
|             evaluate information based on system settings. This gets the current queries,
|             runs them, and returns them;
|PARAMETERS:  1. cb(OPT): callback function after we get the information.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
InitHandler.prototype.initQueries=function(cb) {
  async.waterfall([
    function(_callback) {
      config.mongodb.db.collection("initializequeries").find().toArray(function(err,queries) {
        _callback(err,queries);
      });
    },
    function(queries,_callback) {
      config.mongodb.db.collection("routes").find().sort({order:1}).toArray(function(err,routes) {
        _callback(err,queries,routes);
      });
    },
    function(queries,routes,_callback) {
      config.mongodb.MDB.findRecursive({
        db: config.mongodb.db,
        array: queries
      },function(err,oData) {
        _callback(err,queries,Object.merge({routes:routes},oData));
      });
    }
  ],
    function(err,queries,oData) {
      if (err) return cb(err);
      
      try {
        cb(null,{queries:queries, oData:oData});
      } catch(err) {
        cb(err);
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      event (PUBLIC)
|DESCRIPTION:  Handles getting events of a particular type and executing them.
|PARAMETERS:  1. options(REQ): The type of events we're fetching and running.
|                     options.type: type of event
|                     options.params: object of additional parameters to include.
|             2. cb(REQ): the callback function
|                 cb(err,true/false);
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
InitHandler.prototype.event=function(options,cb) {
  options = options || {};
  
  var type = (typeof options==="string") ? options : (options.type || "");
  var params = (typeof options==="string") ? {} : (options.params || {});
  
  var self = this;
  
  if (!type) {
    cb("No type provided");
    return;
  }
  
  async.parallel([
    function(callback) {
      config.mongodb.db.collection("blogpost").aggregate([
        {
          $match: {path:self.path}
        },
        {
          $project: {
            _id: 0,
            events: {
              $filter: {
                input: "$events",
                as: "event",
                cond: {
                  $eq: ["$$event.type",type]
                }
              }
            }
          }
        }
      ],function(e,doc) {
        callback(e,doc);
      });
    },
    function(callback) {
      config.mongodb.db.collection("defaultevents").find({type:type}).toArray(function(e,events) {
        callback(e,events);
      });
    },
  ],
    function(err,results) {
      if (err) cb(err);
      else {
        var pageEvents = (results[0].length && typeof results[0][0]==="object") ? results[0][0].events : [];
        var defaultEvents = results[1] || [];
        
        var aggregatedEvents = [].concat(pageEvents,defaultEvents);
        
        if (aggregatedEvents.length) {
          var asyncParallel = aggregatedEvents.map(function(event) {
            event = event || {};
            var parameters = Object.merge(params,event.params || {});
            
            return function(callback) {
              var result = new CodeRunner({code:event.code, params:Object.merge({pagepath:self.path},parameters)}).eval();
              
              if (!(result instanceof Error)) callback(null,true);
              else callback(result);
            }
          });
          
          async.parallel(asyncParallel,function(err,results) {
            if (err) cb(err);
            else cb(null,true);
          });
        } else {
          cb(null,true);
        }
      }
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      sanitizePath (PUBLIC)
|DESCRIPTION:  Cleans up a path to be used in the DB.
|PARAMETERS:  1. path(OPT): an optional path to return sanitized
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <string>
-----------------------------------------------------------------------------------------*/
InitHandler.prototype.sanitizePath=function(path) {
  path = (path || this.path || "");
  return this.path = ((path[path.length-1]=="/") ? path.substring(0,path.length-1) : path).toLowerCase();
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=InitHandler;
}
//-------------------------------------------------------