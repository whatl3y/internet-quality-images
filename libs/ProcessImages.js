var path = require("path");
var async = require("async");
var lwip = require("lwip");

module.exports = ProcessImages = function(filePath,options) {
  options = options || {};

  var self = this;
  this.WIDTH = Number(options.width || 1920);
  this.QUALITY = Number(options.quality || 50);

  this.path = filePath;

  this.operationProcessFunction = function(image,operation) {
    return function(_callback) {
      async.waterfall([
        function(__callback) {
          image.clone(__callback);
        },
        function(clonedImage,__callback) {
          self.operations[operation](clonedImage,__callback);
        }
      ],
        function(err,result) {
          return _callback(err,result);
        }
      );
    };
  }

  this.process = function(operation,cb) {
    cb = (typeof operation === "function") ? operation : cb;
    operation = (typeof operation === "function") ? null : operation;

    var go = function(image,callback) {
      var processParallelFunctions = [];
      if (typeof operation === "string" && operation) {
        processParallelFunctions.push(self.operationProcessFunction(image,operation));
      } else {
        for (var _operation in self.operations) {
          processParallelFunctions.push((function() {
            var op = _operation;
            return self.operationProcessFunction(image,op);
          })());
        }
      }

      async.parallel(processParallelFunctions,function(err,results) {
        return callback(err,results);
      });
    }

    async.waterfall([
      function(callback) {
        lwip.open(self.path,callback);
      },
      go
    ],
      function(err,newFilePaths) {
        return (typeof cb === "function") ? cb(err,newFilePaths) : null;
      }
    );
  }

  this.write = function(image,path,cb) {
    image.writeFile(path,{quality:this.QUALITY},cb);
  }

  this.heightWidthRatio = function(image) {
    return image.height()/image.width();
  }

  this.resize = function(image,cb) {
    var newHeight = Math.floor(this.heightWidthRatio(image) * this.WIDTH);
    image.resize(this.WIDTH,newHeight,function(err,newImage) {
      return cb(err,newImage);
    });
  }

  this.cropSquare = function(image,appendToFile,left,top,right,bottom,cb) {
    async.waterfall([
      function(callback) {
        image.crop(left,top,right,bottom,callback);
      },
      function(newImage,callback) {
        self.resize(newImage,callback);
      },
      function(newImage,callback) {
        var newpath = self.newPath(appendToFile);
        self.write(newImage,newpath,function(err) {
          return callback(err,newpath);
        });
      }
    ],
      function(err,newImagePath) {
        return cb(err,newImagePath);
      }
    );
  }

  this.rotate = function(image, appendToFile, degrees, cb) {
    async.waterfall([
      function(callback) {
        image.rotate(degrees,callback);
      },
      function(newImage,callback) {
        self.resize(newImage,callback);
      },
      function(newImage,callback) {
        var newpath = self.newPath(appendToFile);
        self.write(newImage,newpath,function(err) {
          return callback(err,newpath);
        });
      }
    ],
      function(err,newImagePath) {
        return cb(err,newImagePath);
      }
    );
  }

  this.sharpen = function(image, appendToFile, amplitude, cb) {
    async.waterfall([
      function(callback) {
        image.sharpen(amplitude,callback);
      },
      function(newImage,callback) {
        self.resize(newImage,callback);
      },
      function(newImage,callback) {
        var newpath = self.newPath(appendToFile);
        self.write(newImage,newpath,function(err) {
          return callback(err,newpath);
        });
      }
    ],
      function(err,newImagePath) {
        return cb(err,newImagePath);
      }
    );
  }

  this.saturate = function(image, appendToFile, delta, cb) {
    async.waterfall([
      function(callback) {
        image.saturate(delta,callback);
      },
      function(newImage,callback) {
        self.resize(newImage,callback);
      },
      function(newImage,callback) {
        var newpath = self.newPath(appendToFile);
        self.write(newImage,newpath,function(err) {
          return callback(err,newpath);
        });
      }
    ],
      function(err,newImagePath) {
        return cb(err,newImagePath);
      }
    );
  }

  this.lighten = function(image, appendToFile, ratio, cb) {
    async.waterfall([
      function(callback) {
        image.lighten(ratio,callback);
      },
      function(newImage,callback) {
        self.resize(newImage,callback);
      },
      function(newImage,callback) {
        var newpath = self.newPath(appendToFile);
        self.write(newImage,newpath,function(err) {
          return callback(err,newpath);
        });
      }
    ],
      function(err,newImagePath) {
        return cb(err,newImagePath);
      }
    );
  }

  this.newPath = function(newpathstring) {
    var extension = path.extname(this.path);
    var lastPeriod = this.path.lastIndexOf(".");

    return this.path.substring(0,lastPeriod) + newpathstring + extension;
  }

  this.operations = {
    resize: function(image,cb) {
      async.waterfall([
        function(callback) {
          self.resize(image,callback);
        },
        function(newImage,callback) {
          var newpath = self.newPath("_resized");
          self.write(newImage,newpath,function(err) {
            return callback(err,newpath);
          });
        }
      ],
        function(err,newImagePath) {
          return cb(err,newImagePath);
        }
      );
    },

    sharpenBy20: function(image,cb) {
      self.sharpen(image,"_sharpenBy20",20,cb);
    },

    sharpenBy40: function(image,cb) {
      self.sharpen(image,"_sharpenBy40",40,cb);
    },

    sharpenBy60: function(image,cb) {
      self.sharpen(image,"_sharpenBy60",60,cb);
    },

    lightenBy20: function(image,cb) {
      self.lighten(image,"_lightenBy20",0.2,cb);
    },

    lightenBy40: function(image,cb) {
      self.lighten(image,"_lightenBy40",0.4,cb);
    },

    lightenBy60: function(image,cb) {
      self.lighten(image,"_lightenBy60",0.6,cb);
    },

    saturateBy20: function(image,cb) {
      self.saturate(image,"_saturateBy20",0.2,cb);
    },

    saturateBy40: function(image,cb) {
      self.saturate(image,"_saturateBy40",0.4,cb);
    },

    saturateBy60: function(image,cb) {
      self.saturate(image,"_saturateBy60",0.6,cb);
    },

    rotate90: function(image,cb) {
      self.rotate(image,"_rotate90",90,cb);
    },

    rotate180: function(image,cb) {
      self.rotate(image,"_rotate180",180,cb);
    },

    rotate270: function(image,cb) {
      self.rotate(image,"_rotate270",270,cb);
    },

    cropSquareTopLeft: function(image,cb) {
      var hw = self.heightWidthRatio(image);
      var totalWidth = (hw <= 1) ? Math.floor(image.width()*hw) : image.width();
      var totalHeight = (hw <= 1) ? image.height() : Math.floor(image.width()*(1/hw));

      var left = 0;
      var top = 0;
      var right = totalWidth;
      var bottom = totalHeight;

      self.cropSquare(image,"_topleft",left,top,right,bottom,cb);
    },

    cropSquareTopRight: function(image,cb) {
      var hw = self.heightWidthRatio(image);
      var totalWidth = (hw <= 1) ? Math.floor(image.width()*hw) : image.width();
      var totalHeight = (hw <= 1) ? image.height() : Math.floor(image.width()*(1/hw));

      var left = image.width() - totalWidth;
      var top = 0;
      var right = image.width();
      var bottom = totalHeight;

      self.cropSquare(image,"_topright",left,top,right,bottom,cb);
    },

    cropSquareBottomLeft: function(image,cb) {
      var hw = self.heightWidthRatio(image);
      var totalWidth = (hw <= 1) ? Math.floor(image.width()*hw) : image.width();
      var totalHeight = (hw <= 1) ? image.height() : Math.floor(image.width()*(1/hw));

      var left = 0;
      var top = totalHeight - image.height();
      var right = totalWidth;
      var bottom = image.height();

      self.cropSquare(image,"_bottomleft",left,top,right,bottom,cb);
    },

    cropSquareBottomRight: function(image,cb) {
      var hw = self.heightWidthRatio(image);
      var totalWidth = (hw <= 1) ? Math.floor(image.width()*hw) : image.width();
      var totalHeight = (hw <= 1) ? image.height() : Math.floor(image.width()*(1/hw));

      var left = image.width() - totalWidth;
      var top = totalHeight - image.height();
      var right = image.width();
      var bottom = image.height();

      self.cropSquare(image,"_bottomright",left,top,right,bottom,cb);
    },

    cropSquareCenter: function(image,cb) {
      var hw = self.heightWidthRatio(image);
      var totalWidth = (hw <= 1) ? Math.floor(image.width()*hw) : image.width();
      var totalHeight = (hw <= 1) ? image.height() : Math.floor(image.width()*(1/hw));

      var left = Math.floor((image.width() - totalWidth)/2);
      var top = Math.floor((image.height() - totalHeight)/2);
      var right = left + totalWidth;
      var bottom = top + totalHeight;

      self.cropSquare(image,"_center",left,top,right,bottom,cb);
    }
  }
}
