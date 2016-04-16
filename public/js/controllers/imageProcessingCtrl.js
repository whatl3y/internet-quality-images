function imageProcessingCtrl($scope,$http,Upload) {
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax({type:"init"},function(err,data) {
        if (err) return $scope.uploadError = err;
        
        console.log(data);
        $scope.processTypes = data.types;
        $scope.functions.flipTypesSelected();
      });
    },
    
    flipTypesSelected: function() {
      $scope.typesSelected = $scope.typesSelected || {};
      
      _.each($scope.processTypes,function(categories) {
        _.each(categories,function(t) {
          $scope.typesSelected[t.key] = !$scope.typesSelected[t.key];
        });
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
      delete($scope.uploadError);
      
      if ($scope.email && /^.+@.+\.[\w\d]{1,10}$/.test($scope.email)) {
        angular.element( "#imageFile" ).trigger("click");
      } else {
        $scope.uploadError = "Please enter a valid e-mail address (email@domain.com) for us to notify you when you're images are done being processed.";
      }
    },
    
    uploadFile: function(file,name) {
      $scope.files = file;
      this.processImages();
    },
    
    processImages: function() {
      delete($scope.uploadError);
      
      if ($scope.files) {
        var loader = new Core.Modals().asyncLoader({message:"We're processing your image now! Please feel free to continue working!"});
        $scope.functions.fileAjax($scope.files,{type:"processImage", types:$scope.typesSelected, email:$scope.email},function(err,data) {
          if (err) return $scope.uploadError = err;
          
          console.log(err,data);
          loader.remove();
        })
      } else {
        $scope.uploadError = "There are no images to process!";
      }
    }
  }
  
  $scope.functions.initialize();
}