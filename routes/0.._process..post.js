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
          config.mongodb.db.collection("process_types").find({active:{ $ne:false }},{_id:0}).sort({category:1,name:1}).toArray(function(e,types) {
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
        var typesSelectedKeys = Object.keys(typesSelected);
        
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
            var updatedImages = [];
            
            async.each(typesSelectedKeys,function(sel,_callback) {
              var key = sel;
              var shouldCreate = typesSelected[key];
              
              if (shouldCreate) {
                var newFileName = arch.fileHandler.getFileName(imageData[0].name,key);
                
                ImageHandler.applyChange({image:imageData[0].data, type:key},function(err,newFileBuffer) {
                  if (err) return _callback(err);
                  
                  updatedImages.push({
                    name: newFileName,
                    data: newFileBuffer
                  });
                  return _callback(null);
                });
              } else {
                _callback(null);
              }
            },
              function(__e) {
                callback(__e,updatedImages);
              }
            );
          },
          function(allUpdatedImages,callback) {
            async.each(allUpdatedImages,function(i,_callback) {
              try {
                i.stream = streamifier.createReadStream(i.data);
                
                arch.fileHandler.uploadFile({readStream:i.stream, filename:i.name, exactname:1},function(err,_newFileName) {
                  if (err) return _callback(err);
                  
                  imageData.push({
                    name: _newFileName,
                    data: i.data
                  });
                  
                  _callback(null);
                });
              } catch(_e) {
                _callback(_e);
              }
            },
              function(__e) {
                callback(__e);
              }
            );
          },
          function(callback) {
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
          },
          function(callback) {
            try {
              var expDate = new Date();
              expDate.setDate(expDate.getDate() + 30);
              
              config.mongodb.db.collection("processed_images").insert({
                guid: uuid.v1(),
                images: imageData.map(function(id) {return id.name}),
                zip: imageData[imageData.length-1].name,
                email: packageEmail,
                date: new Date(),
                expiration_date: expDate
              },function(err) {
                callback(err);
              });
            } catch(e) {
              callback(e);
            }
          }
        ],
          function(err) {
            if (err) {
              res.json({success:false, error:"There was an error while converting your images."});
              log.error(err);
              return;
            }
            
            res.json({success:true, data:imageData.map(function(id) {return id.name})});
          }
        );
      }
      
      break;
      
    default:
      res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
  }
})