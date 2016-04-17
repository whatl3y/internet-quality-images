(function(req,res) {
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  var imageGuid = req.params.guid;
  var zipName = "InternetQualityImages.com_" + Date.now() + ".zip";
  var arch = new FileArchiver({db:config.mongodb.db, name:zipName});
  
  ImageHandler.process({guid:imageGuid, archiver:arch},function(err,imageData) {
    if (err) {
      log.error(err);
      return res.send("Sorry, there was an issue processing these images.");
    }
    
    res.send("Success!");
  });
})