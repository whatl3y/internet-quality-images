var fs = require("fs");
var async = require("async");
var imageinfo = require("imageinfo");
var Jimp = require("jimp");
var streamifier = require("streamifier");
var Object = require("../public/js/Object_prototypes.js");
var config = require("./config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    ImageHandler.js
|PURPOSE:  Allows you to take images and read information about them and manipulate/save them
|         as new files.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  socket.io
|REVISION HISTORY:  
|      *LJW 4/10/2016 - created
-----------------------------------------------------------------------------------------*/
ImageHandler = module.exports = {
  applyChange: change,
  change: change,
  info: imageInfo,
  infoFile: imageInfoFile,
  infoBuffer: getBufferImageInfo,
  process: processAndArchive,
  processAndArchive: processAndArchive
}

/*-----------------------------------------------------------------------------------------
|NAME:      change (PUBLIC)
|DESCRIPTION:  Gets information about an image given the image data as a buffer.
|PARAMETERS:  1. obj(REQ): object of information to do with the image
|                   image: EITHER a string that stores the file path of the image we're
|                        changing or a buffer of image data.
|                   type: the type of image we're creating, which can be either tiny, small, medium, large, x-large
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
function change(obj,cb) {
  obj = obj || {};
  var image = obj.image || "";
  var type = obj.type || "medium";
  var mime = obj.mime || Jimp.MIME_PNG;
  
  async.waterfall([
    function(callback) {
      Jimp.read(image,function(err,jimpImage) {
        callback(err,image,jimpImage);
      });
    },
    function(mainImage,jimpImage,callback) {
      var foo = imageWriteTypeFunction(type,obj.dest || obj.destination,mime);
      if (foo instanceof Error) return callback(foo);
      
      foo(mainImage,jimpImage,callback);
    }
  ],
    function(err,writeResult) {
      cb(err,writeResult);
    }
  );
}

/*-----------------------------------------------------------------------------------------
|NAME:      imageInfo (PUBLIC)
|DESCRIPTION:  Gets information about an image given a file path
|PARAMETERS:  1. image(REQ): The strategy type we're authenticating with
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
function imageInfo(image,cb) {
  if (typeof image === "string") return imageInfoFile(image,cb);
  
  return getBufferImageInfo(image,cb);
}

/*-----------------------------------------------------------------------------------------
|NAME:      imageInfoFile (PUBLIC)
|DESCRIPTION:  Gets information about an image given a file path
|PARAMETERS:  1. imagePath(REQ): The strategy type we're authenticating with
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
function imageInfoFile(imagePath,cb) {
  imagePath = imagePath || "";
  
  fs.readFile(imagePath, function(err,data) {
    if (err) return cb(err);
    getBufferImageInfo(data,cb);
  });
}

/*-----------------------------------------------------------------------------------------
|NAME:      getBufferImageInfo (PUBLIC)
|DESCRIPTION:  Gets information about an image given the image data as a buffer.
|PARAMETERS:  1. bufferData(REQ): image data in buffer
|             2. cb(REQ): 
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
function getBufferImageInfo(bufferData,cb) {
  try {
    var i = Object.merge({size:bufferData.length},imageinfo(bufferData));
    cb(null,i);
  } catch(_err) {
    cb(_err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      imageWriteTypeFunction (PUBLIC)
|DESCRIPTION:  Returns a function based on what you are doing to an image.
|PARAMETERS:  1. type(REQ): the type of image we're going to create from the source image.
|             2. destination(REQ): either a file path as a string, or null if we're returning
|                   the new image in a buffers
|             3. mime(OPT): the mime type we're applying to the image if it's a buffer
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    <function>: function to pass to a jimp image
-----------------------------------------------------------------------------------------*/
function imageWriteTypeFunction(type,destination,mime) {
  var dest = destination || null;
  var writeFunction = (typeof dest === "string") ? "write" : "getBuffer";
  
  var typeFunctions = {
    customWidth: function(pathOrBuffer,jimpImage,cb) {
      
    },    
    same: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        [writeFunction](dest || mime,cb);
    },
    tiny: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .resize(100,Jimp.AUTO)
        [writeFunction](dest || mime,cb);
    },
    small: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .resize(256,Jimp.AUTO)
        [writeFunction](dest || mime,cb);
    },
    medium: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .resize(512,Jimp.AUTO)
        [writeFunction](dest || mime,cb);
    },
    large: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .resize(768,Jimp.AUTO)
        [writeFunction](dest || mime,cb);
    },
    xlarge: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .resize(1024,Jimp.AUTO)
        [writeFunction](dest || mime,cb);
    },
    gray: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .greyscale()
        [writeFunction](dest || mime,cb);
    },
    invertColors: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .invert()
        [writeFunction](dest || mime,cb);
    },
    flipHorizontal: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .flip(true,false)
        [writeFunction](dest || mime,cb);
    },
    makeSquare: function(pathOrBuffer,jimpImage,cb) {
      imageInfo(pathOrBuffer,function(err,oInfo) {
        if (err) return function() {cb(err);}
        
        var length = (oInfo.width < oInfo.height) ? oInfo.width : oInfo.height;
        jimpImage
          .crop(0,0,length,length)
          [writeFunction](dest || mime,cb);
      });
    },
    flipVertical: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .flip(false,true)
        [writeFunction](dest || mime,cb);
    },
    opaque: function(pathOrBuffer,jimpImage,cb) {
      jimpImage
        .opacity(0.5)
        [writeFunction](dest || mime,cb);
    }
  }
  
  try {
    return typeFunctions[type];
  } catch(err) {
    return err;
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      processAndArchive (PUBLIC)
|DESCRIPTION:  Takes the name of an image we stored in GridFS and processes it
|PARAMETERS:  1. options(REQ): options required to process
|                     options.guid(REQ): the GUID in the uid key in processed_images
|                     options.archiver(REQ): instance of FileArchiver
|             3. cb(REQ): the callback
|                     cb(err,guid,newImageData)
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
function processAndArchive(options,cb) {
  try {
    var db = options.db || config.mongodb.db;
    var uniqueId = options.guid;
    var arch = options.archiver || new require("./FileArchiver.js")();
    var self = this;
    
    var imageData = [];
    
    async.waterfall([
      function(callback) {
        db.collection("processed_images").find({guid:uniqueId}).toArray(function(e,record) {
          if (e) return callback(e);
          if (!record || !record.length) return callback("There is no record with the uniqueidentifier: " + uniqueId);
          if (record[0].isProcessed) return callback("This image has already been processed.");
          
          callback(null,record[0].imageName,record[0].processTypes);
        });
      },
      function(mainImageFileName,typesSelected,callback) {
        arch.fileHandler.getFile({file:mainImageFileName, encoding:"base64"},function(err,base64Data) {
          if (err) return callback(err);
          
          var bufferData = new Buffer(base64Data,"base64");
          
          imageData.push({
            name: mainImageFileName,
            data: bufferData
          });
          callback(null,typesSelected);
        });
      },
      function(typesSelected,callback) {
        var typesSelectedKeys = Object.keys(typesSelected);
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
          
          //If it takes longer than 30 seconds to add the file
          //file, assume it will never create it and move on.
          setTimeout(function() {
            try {
              if (!called) {
                _callback();
              }
            } catch(err) {}
          },30000);
          
          //try to add the file
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
        var created = false;
        
        //If it takes longer than 30 seconds to create the zip
        //file, assume it will never create it and move on.
        setTimeout(function() {
          try {
            if (!created) {
              callback(null,false);
            }
          } catch(err) {}
        },30000);
        
        //finalize the archived file
        arch.done(function(err,_zipName) {
          if (err) return callback(err);
          
          imageData.push({
            name: _zipName,
            data: "N/A"
          });
          
          created = true;
          callback(null,true);
        });
      },
      function(createdZip,callback) {
        try {
          var expDate = new Date();
          expDate.setDate(expDate.getDate() + 30);
          
          db.collection("processed_images").update({guid:uniqueId},{
            $set: {
              images: imageData.map(function(id) {return id.name}),
              zip: (createdZip) ? imageData[imageData.length-1].name : false,
              expiration_date: expDate,
              isProcessed: true
            }
          },function(err) {
            callback(err);
          });
        } catch(e) {
          callback(e);
        }
      }
    ],
      function(err) {
        cb(err,imageData);
      }
    );
  } catch(err) {
    cb(err);
  }
}