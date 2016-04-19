(function(req,res) {
  var imageGuid = req.params.guid;
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  async.waterfall([
    function(callback) {
      config.mongodb.db.collection("processed_images").find({guid:imageGuid},{_id:0,images:1,isProcessed:1,expiration_date:1}).toArray(function(err,file) {
        if (err || !file.length) return callback(err || "There are no processed images with the package identifier: " + imageGuid);
        if (!file[0].isProcessed) return callback("This image has not been processed yet.");
        
        callback(null,file[0].images,file[0].expiration_date);
      });
    }
  ],
    function(err,images,exp) {
      if (err) {
        if (err instanceof Error) {
          log.error(err);
          return res.render("find",{guid:imageGuid, error:"There was a problem trying to get your processed images. Please try again."});
        }
        
        return res.render("find",{guid:imageGuid, error: err});
      }
      
      images = (images || []).sort().filter(function(i) {return path.extname(i) != ".zip"});
      
      res.render("find",{guid:imageGuid, images:images, exp:exp});
      audit.log({type:"Find Images",additional:{guid:imageGuid}});
    }
  );
})