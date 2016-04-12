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
          config.mongodb.db.collection("process_types").find({active:{ $ne:false }},{_id:0}).sort({name:1}).toArray(function(e,types) {
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
          
          res.json({success:true, types:types});
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
        var imageData = [];
        
        var zipName = "InternetQualityImages.com_" + Date.now() + ".zip";
        var arch = new FileArchiver({db:config.mongodb.db, name:zipName});
        
        async.waterfall([
          function(callback) {
            arch.fileHandler.uploadFile({path:filePath, filename:fileName},function(err,newFileName) {
              callback(err,newFileName);
              
              fs.unlink(filePath,function(e) {
                if (e) log.error(e);
              });
            })
          },
          function(mainImageFileName,callback) {
            arch.fileHandler.getFile({file:mainImageFileName, encoding:"base64"},function(err,base64Data) {
              if (err) return callback(err);
              
              var bufferData = new Buffer(base64Data,"base64");
              
              imageData.push({
                name: mainImageFileName,
                data: bufferData
              });
              callback();
            });
          },
          function(callback) {
            var newFileName = arch.fileHandler.getFileName(imageData[0].name,"tiny");
            
            ImageHandler.applyChange({image:imageData[0].data, type:"tiny"},function(err,newFileBuffer) {
              callback(err,newFileName,newFileBuffer);
            });
          },
          function(newFileName,newFileBuffer,callback) {
            try {
              var newFileReadStream = streamifier.createReadStream(newFileBuffer);
              
              arch.fileHandler.uploadFile({readStream:newFileReadStream, filename:newFileName, exactname:1},function(err,_newFileName) {
                if (err) return callback(err);
                
                imageData.push({
                  name: _newFileName,
                  data: newFileBuffer
                });
                
                callback(null,imageData);
              });
            } catch(_e) {
              callback(_e);
            }
          },
          function(imageData,callback) {
            async.each(imageData,function(iData,_callback) {
              var called = false;
              arch.addFile({fileName:iData.name, data:iData.data},function(data) {
                if (!called) {
                  called = true;
                  _callback();
                }
              });
            },
            function(err) {
              callback(err);
            });            
          },
          function(callback) {
            arch.done(function(err,_zipName) {
              if (err) return callback(err);
              
              imageData.push({
                name: zipName,
                data: "N/A"
              });
              callback();
            });
          }
        ],
          function(err) {
            if (err) {
              res.json({success:false, error:"There was an error while converting your images."});
              log.error(err);
              return;
            }
            
            res.json({success:true, data:imageData});
          }
        );
      }
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})