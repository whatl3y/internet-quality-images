(function(req,res) {
  var info = req.body;
  if (info.file) {
    var fileInfo = info.file;
    var fileName = fileInfo.name;
    var filePath = fileInfo.path;
    var fileType = fileInfo.type;
  }
  
  var audit = new Audit({ip:req.ip, hostname:req.hostname, ua:req.headers['user-agent']});
  
  switch(info.type) {
    case "init":
      async.parallel([
        function(callback) {
          config.mongodb.db.collection("process_types").find({active:{ $ne:false }},{_id:0}).sort({category:1,order:1,name:1}).toArray(function(e,types) {
            callback(e,types);
          });
        }
      ],
        function(err,results) {
          if (err) {
            res.json({success:false});
            return log.error(err);
          }
          
          var types = results[0];
          var oTypes = {};
          _.each(types,function(t) {
            oTypes[t.category] = oTypes[t.category] || [];
            oTypes[t.category].push(t);
          });
          
          res.json({success:true, types:oTypes});
        }
      );
      
      break;
    
    case "processImage":
      if (!filePath) {
        res.json({success:false, error:"There was no file to process."});
        
      } else if (!(fileType == "image/png" || fileType == "image/jpeg" || fileType == "image/bmp")) {
        res.json({success:false, error:"We currently only support PNG, JPEG, and BMP image types. Please make sure your image is not corrupted and try again."});
        log.info("Uploaded an unsupported image type: " + fileType);
        
        fs.unlink(filePath,function(e) {
          if (e) log.error(e);
        });
        
      } else {
        var packageEmail = info.email;
        var typesSelected = JSON.parse(info.types);
        
        var fileHandler = new FileHandler({db:config.mongodb.db});
        
        async.waterfall([
          function(callback) {
            fileHandler.uploadFile({path:filePath, filename:fileName},function(err,newFileName) {
              callback(err,newFileName);
              
              fs.unlink(filePath,function(e) {
                if (e) log.error(e);
              });
            })
          },
          function(newFileName,callback) {
            try {
              var uid = uuid.v1();
              
              config.mongodb.db.collection("processed_images").insert({
                guid: uid,
                imageName: newFileName,
                processTypes: typesSelected,
                email: packageEmail,
                date: new Date()
              },function(err) {
                callback(err,uid);
              });
            } catch(e) {
              callback(e);
            }
          }
        ],
          function(err,uid) {
            if (err) {
              res.json({success:false, error:"There was an error while converting your images."});
              log.error(err);
              return;
            }
            
            res.json({success:true, guid:uid});
          }
        );
      }
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})