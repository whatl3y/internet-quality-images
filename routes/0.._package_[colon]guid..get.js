(function(req,res) {
  var imageGuid = req.params.guid;
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  var fh = new FileHandler({db:config.mongodb.db});
  
  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("processed_images").find({guid:imageGuid},{zip:1}).toArray(function(err,file) {
        if (err || !file.length) return callback(err || "There are no processed images with the unique identifier: " + imageGuid + ".");
        
        callback(null,file[0].zip);
      });
    },
    function(zipFileName,callback) {
      fh.findFiles({filename:zipFileName,one:true},function(err,file) {
        callback(err,zipFileName,file);
      });
    },
    function(zipFileName,file,callback) {
      if (!file) return callback("Sorry, we could not find the zip file you are looking for.");
      
      callback(null,zipFileName,file);
    }
  ],
    function(err,zipFileName,file) {
      if (err) {
        log.error(err);
        return res.send((err instanceof Error) ? "There was a problem trying to get your processed images. Please try again." : err);
      }
      
      var contentType = file.contentType;
      //var length = file.length;
      
      res.setHeader("contentType",contentType);
      var readStream = fh.gfs.createReadStream({filename:zipFileName});
      readStream.pipe(res);
      
      audit.log({type:"Get Package",additional:{guid:imageGuid,filename:zipFileName}});
    }
  );
})