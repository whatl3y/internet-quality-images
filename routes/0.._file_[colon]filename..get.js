(function(req,res) {
  var filename = req.params.filename;
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  var fh = new FileHandler({db:config.mongodb.db});
  
  fh.findFiles({filename:filename,one:true},function(err,file) {
    if (err) res.send(err);
    else if (!file) res.send("Sorry, we could not file a file with filename: " + filename + ".");
    else {
      var contentType = file.contentType;
      //var length = file.length;
      
      res.setHeader("contentType",contentType);
      var readStream = fh.gfs.createReadStream({filename:filename});
      readStream.pipe(res);
      
      audit.log({type:"Get File",additional:{filename:filename}});
    }
  });
})