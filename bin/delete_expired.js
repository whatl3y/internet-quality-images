var async = require("async");
var FileHandler = require("../libs/FileHandler.js");
var config = require("../libs/config.js");

async.waterfall([
  function(callback) {
    config.mongodb.initialize(function(err,options) {
      callback(err);
    });
  },
  function(callback) {
    config.mongodb.db.collection("processed_images").find({isProcessed:true, expiration_date:{$lt:new Date()}}, {_id:0,guid:1,images:1}).toArray(function(err,expired) {
      callback(err,expired);
    });
  },
  function(expired,callback) {
    if (!expired || !expired.length) return callback("No expired packages to delete.");
    
    var fh = new FileHandler({db:config.mongodb.db});
    
    async.each(expired,function(imagePackage,_callback) {
      var imageGuid = imagePackage.guid;
      var imagesAndZip = imagePackage.images;
      
      imagesAndZip = imagesAndZip.map(function(i) {
        return function(__callback) {
          fh.deleteFile({filename:i},__callback);
        }
      });
      
      async.parallel(imagesAndZip.concat([
        function(__callback) {
          config.mongodb.db.collection("processed_images").remove({guid:imageGuid},function(_err) {
            __callback(_err);
          });
        }
      ]),
        function(_err) {
          _callback(_err);
        }
      );
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
    
    console.log("Successfully deleted all expired packages at " + new Date() + "!");
  }
);