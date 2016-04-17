var async = require("async");
var ImageHandler = require("../libs/ImageHandler.js");
var FileArchiver = require("../libs/FileArchiver.js");
var config = require("../libs/config.js");

var guidsProcessed = [];

async.waterfall([
  function(callback) {
    config.mongodb.initialize(function(err,options) {
      callback(err);
    });
  },
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

      ImageHandler.process({guid:imageGuid, db:config.mongodb.db, archiver:arch},function(err,imageData) {
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
  function(err) {
    config.mongodb.MDB.close();
    if (err) return console.log(err);
    
    console.log("Successfully processed all images at " + new Date() + "!");
  }
);