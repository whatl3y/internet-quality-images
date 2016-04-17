var async = require("async");
var ImageHandler = require("../libs/ImageHandler.js");
var FileArchiver = require("./libs/FileArchiver.js");
var Audit = require("../libs/Audit.js");
var config = require("../libs/config.js");

var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
var guidsProcessed = [];

async.waterfall([
  function(callback) {
    config.mongodb.db.collection("processed_images").find({isProcessed:{$ne:true}}).toArray(function(err,unprocessed) {
      callback(err,unprocessed);
    });
  },
  function(unprocessed,callback) {
    if (!unprocessed || !unprocessed.length) return callback("No unprocessed files to process.");
    
    async.each(unprocessed,function(image,_callback) {
      var imageGuid = image.guid;
      var zipName = "InternetQualityImages.com_" + Date.now() + ".zip";
      var arch = new FileArchiver({db:config.mongodb.db, name:zipName});

      ImageHandler.process({guid:imageGuid, archiver:arch},function(err,imageData) {
        guidsProcessed.push(imageGuid);
        _callback(err);
      });
    },
      function(err) {
        callback(err);
      }
    );
  }
],
  function(err,result) {
    if (err) return log.info(err);
    
    log.debug("Successfully processed images with GUIDs: " + guidsProcessed.join(" ,"));
  }
);