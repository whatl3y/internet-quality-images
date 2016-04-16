var fs = require("fs");
var archiver = require('archiver');
var FileHandler = require("./FileHandler.js");
var config = require("./config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    FileArchiver.js
|PURPOSE:  Takes files and things and archives them in zip or tar files.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  archiver, FileHandler.js
|REVISION HISTORY:  
|      *LJW 4/12/2016 - created
-----------------------------------------------------------------------------------------*/
FileArchiver=function(options,callback) {
  options = options || {};
  
  this.fileHandler = new FileHandler({db: options.db || config.mongodb.db});
  
  this.name = options.name || null;
  this.type = options.type || null;
  
  if (this.name) {
    this.createArchive(this.name,this.type);
    this.startListening(callback);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      startListening (PUBLIC)
|DESCRIPTION:  Bind event handlers to this.archive to listen for files.
|PARAMETERS:  1. cb(OPT): The callback function to do something after the file was created in GridFS
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileArchiver.prototype.startListening=function(cb) {
  cb = cb || function(){};
  var self = this;
  
  var endFunctionExecuted = false
  var endFunction = function() {
    if (!endFunctionExecuted) {
      endFunctionExecuted = true;
      self.fileHandler.uploadFile({readStream:self.archive, filename:self.name, exactname:1},cb);
    }
  }
  
  this.archive.removeAllListeners("end");
  this.archive.removeAllListeners("close");
  this.archive.removeAllListeners("finish");
  
  this.archive.on("end",endFunction);
  this.archive.on("close",endFunction);
  this.archive.on("finish",endFunction);
}

/*-----------------------------------------------------------------------------------------
|NAME:      createArchive (PUBLIC)
|DESCRIPTION:  Finds a file based
|PARAMETERS:  1. name(OPT): The name of the zip we're creating DEFAULT: this.name
|             2. type(OPT): the type of archive we're creating DEFAULT: "zip"
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    <archive instance/Error>
-----------------------------------------------------------------------------------------*/
FileArchiver.prototype.createArchive=function(name,type) {
  try {
    this.archive = archiver.create(type || "zip", {name: name || this.name}); // or archiver('zip', {});
    this.archive.setMaxListeners(100);
    
    return this.archive;
  } catch(err) {
    return err;
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      addFile (PUBLIC)
|DESCRIPTION:  Adds a new file/buffer to the archive.
|PARAMETERS:  1. options(REQ)
|                         1. fileName(REQ): the name of the file we're adding to the archive
|                         2. dataOrPath(REQ): the buffer data, stream, or string to add to the archive. If
|                             isPath = true, this is a string to represent a file path of a file we're adding.
|                         3. isPath(OPT): boolean to indicate whether data is a string of an absolute file path to
|                             create a buffer and append instead of assuming data is just the data.
|             2. cb(OPT): optional callback function to do something after adding a file to the archive stream.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileArchiver.prototype.addFile=function(options,cb) {
  options = options || {};
  
  //if we pass a callback, remove any listeners
  //that currently exist to the entry event and bind
  //the callback to the entry event.
  if (typeof cb==="function") {
    //this.archive.removeAllListeners("entry");
    this.archive.on("entry",cb);
  } else cb = function(){};
  
  var fileName = options.fileName;
  var dataOrPath = options.data || options.path;
  var isPath = options.isPath || null;
  
  var self = this;
  
  if (isPath) {
    fs.readFile(dataOrPath,function(err,bufferData) {
      if (err) return cb(err);
      self.archive.append(bufferData,{name:fileName});
    });
  } else this.archive.append(dataOrPath,{name:fileName});
}

/*-----------------------------------------------------------------------------------------
|NAME:      done (PUBLIC)
|DESCRIPTION:  When we're done adding files to the archive, call this to emit the end, close,
|               or finish event to store the new archived file.
|PARAMETERS:  1. cb(OPT): optional callback to replace the current finalized event handlers with.
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileArchiver.prototype.done=function(cb) {
  if (typeof cb==="function") this.startListening(cb);
  this.archive.finalize();
}

/*-----------------------------------------------------------------------------------------
|NAME:      finalize (PUBLIC)
|DESCRIPTION:  Alias for this.done()
|PARAMETERS:  see this.done()
|SIDE EFFECTS:  None
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
FileArchiver.prototype.finalize=function(cb) {
  return this.done(cb);
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=FileArchiver;
}
//-------------------------------------------------------