var path = require("path");
var async = require("async");
var ImageHandler = require("../libs/ImageHandler.js");
var FileArchiver = require("../libs/FileArchiver.js");
var GetHTML = require("../libs/GetHTML.js");
var Mailer = require("../libs/Mailer.js");
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
  },
  function(callback) {
    async.each(guidsProcessed,function(g,_callback) {
      config.mongodb.db.collection("processed_images").find({guid:g}).toArray(function(err,unp) {
        if (err) return _callback(err);
        
        unp = (!unp || !unp.length) ? {} : unp[0];
        if (!unp.email) return _callback();
        
        var imageEmail = unp.email;
        var imageGuid = unp.guid;
        var imageList = "<li>" + unp.images.sort()
          .filter(function(i) {
            return path.extname(i) != ".zip"
          }).map(function(i) {
            return "<a href='http://internetqualityimages.com/file/" + i + "'>" + i + "</a>";
          }).join("</li><li>") + "</li>";
        
        var gH = new GetHTML({fullpath: path.join(__dirname,"..","views","email","process.html")});
        gH.html(function(e,emailHtml) {
          if (e) return _callback(e);
          
          //NOTE: replacing here instead of the template because
          //the build in template renderer in nodemailer escapes
          //the keys for the HTML field.
          emailHtml = emailHtml.replace("{{images}}",imageList);
          
          new Mailer({
            send: true,
            from: config.smtp.core.auth.user,
            to: imageEmail,
            bcc: [process.env.EMAIL_BCC || ""],
            template: {
              templateInfo: {
                subject: "InternetQualityImages Package ID: " + imageGuid + " complete!",
                html: emailHtml
              },
              
              keys: {
                guid: imageGuid,
                images: imageList
              },
              
              cb: function(e,info) {
                _callback(e)
              }
            }
          });
        });
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