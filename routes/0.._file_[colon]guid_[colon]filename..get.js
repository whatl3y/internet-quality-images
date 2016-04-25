(function(req,res) {
  var imageGuid = req.params.guid;
  var filename = req.params.filename;
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  var fh = new FileHandler({db:config.mongodb.db});
  
  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("processed_images").find({guid:imageGuid},{_id:0, images:1}).toArray(function(err,file) {
        if (err || !file.length) return callback(err || "There are no processed images with the unique identifier: " + imageGuid + ". Please make sure you have the correct package ID and the package hasn't expired.");
        if (!file[0].images || !file[0].images.length) return callback("Your image has not been processed yet.");
        
        var images = file[0].images;
        var found = false;
        for (var _i = 0;_i<images.length;_i++) {
          if (images[_i] == filename) {
            found = true;
            break;
          }
        }
        
        if (!found) return callback("We could find the image with filename: " + filename + " in the package with ID: " + imageGuid + ". Please make sure the package ID and image name is correct and try again.");
        
        callback(null,filename);
      });
    },
    function(fileName,callback) {
      fh.findFiles({filename:fileName,one:true},function(err,file) {
        callback(err,fileName,file);
      });
    },
    function(fileName,file,callback) {
      if (!file) return callback("Sorry, we could not find the zip file you are looking for.");
      
      callback(null,fileName,file);
    }
  ],
    function(err,fileName,file) {
      if (err) {
        if (err instanceof Error) log.error(err);
        return res.send((err instanceof Error) ? "There was a problem trying to get your processed images. Please try again." : err);
      }
      
      var contentType = file.contentType;
      //var length = file.length;
      
      res.setHeader("contentType",contentType);
      var readStream = fh.gfs.createReadStream({filename:fileName});
      readStream.pipe(res);
      
      audit.log({type:"Get Package Image",additional:{guid:imageGuid,filename:fileName}});
    }
  );
})