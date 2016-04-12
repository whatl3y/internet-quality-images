function imageProcessingCtrl($scope,$http,Upload) {
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax({type:"init"},function(err,data) {
        if (err) return $scope.uploadError = err;
        
        $scope.processTypes = data.types;
      });
    },
    
    ajax: function(data,cb) {
      $http.post('/process',data)
      .success(function(ret) {
        if (!ret.success) cb(ret.error || "Error");
        else cb(null,ret);
      })
      .error(function(data,err) {
        cb(err,data);
      });
    },
    
    fileAjax: function(files,data,cb) {
      Upload.upload(Object.merge({url:"/process", file:files},{fields:data || {}}))
      .success(function(ret) {
        if (!ret.success) cb(ret.error || "Error");
        else cb(null,ret);
      })
      .error(function(ret,_err) {
        cb(_err,ret);
      });
    }
  };
  
  $scope.handlers= {
    fileInputClick: function() {
      angular.element( "#imageFile" ).trigger("click");
    },
    
    uploadFile: function(file,name) {
      $scope.files = file;
      this.processImages();
    },
    
    processImages: function() {
      delete($scope.uploadError);
      
      if ($scope.files) {
        $scope.functions.fileAjax($scope.files,{type:"processImage"},function(err,data) {
          if (err) return $scope.uploadError = err;
          
          console.log(err,data);
        })
      } else {
        $scope.uploadError = "There are no images to process!";
      }
    }
  }
  
  $scope.functions.initialize();
}