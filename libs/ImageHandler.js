var fs = require("fs");
var async = require("async");
var imageinfo = require("imageinfo");
var Jimp = require("jimp");
var Object = require("../public/js/Object_prototypes.js");

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
  infoFile: imageInfoFile,
  infoBuffer: getBufferImageInfo
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