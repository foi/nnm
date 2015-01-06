var nnm = angular.module('nnm', ['ngRoute']);

nnm.config( function ($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'public/html/hot.html',
    controller: 'HotCtrl'
  }).when('/config', {
    templateUrl: 'public/html/config.html',
  }).when('/dictionaries', {
    templateUrl: 'public/html/dictionaries.html',
  })
});

nnm.controller('HotCtrl', ['$scope', function ($scope) {
  $scope.model = {
    message: "dhsklhlkh"
  };
}]);

nnm.controller('NavCtrl', ['$scope', '$http', function ($scope, $http) {
  $http.get('/config/db_connection').
  success(function (data) {
    data == "EALREADYCONNECTED" ? $scope.dbConnected = true : $scope.dbConnected = false
  }).
  error(function () {
    $scope.dbStatus = "Ошибка"
  });
  $http.get('/config/servicennm').
  success(function (data) {
    $scope.ServiceNNM = data;
  });
}]);