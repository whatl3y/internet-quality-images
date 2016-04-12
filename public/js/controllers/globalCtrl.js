function globalCtrl($scope,$http) {
  $scope.functions= {
    initialize: function() {
      
    },
    
    ajax: function(data,cb) {
      $http.post('/global',data)
      .success(function(ret) {
        if (!ret.success) cb(ret.error || "Error");
        else cb(null,ret);
      })
      .error(function(data,err) {
        cb(err,data);
      });
    }
  };
  
  $scope.handlers= {
    
  }
  
  $scope.functions.initialize();
}