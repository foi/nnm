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
  $scope.message = "dhsklhlkh";
}]);

nnm.controller('NavCtrl', ['$rootScope','$scope', '$http', '$location', function ($rootScope, $scope, $http, $location) {
  $http.get('/config/db_connection').
  success(function (data) {
    data == "EALREADYCONNECTED" ? $rootScope.dbConnected = true : $rootScope.dbConnected = false;
  }).
  error(function () {
    $rootScope.dbStatus = "Ошибка"
  });
  $http.get('/config/servicennm').
  success(function (data) {
    $rootScope.ServiceNNM = data;
  });
  // активна ли вкладка
  $scope.isActive = function (route) {
    return route === $location.path();
  };
}]);

// nnm.directive('LineChart', [function () {
//   return {
//     restrict: 'E',
//     template: '<div></div>',
//     replace: true,
//     link: function ($scope, element, attrs) {
//       var data: 
//     }
//   };
// }])