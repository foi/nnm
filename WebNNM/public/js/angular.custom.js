var nnm = angular.module('nnm', ['ngRoute', 'ngResource', 'xeditable']);

nnm.run(function(editableOptions, editableThemes) {
  editableThemes.bs3.inputClass = 'input-sm';
  editableThemes.bs3.buttonsClass = 'btn-sm';
  editableOptions.theme = 'bs3';
});

nnm.config( function ($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'public/html/hot.html',
    controller: 'HotCtrl'
  }).when('/config', {
    templateUrl: 'public/html/config.html',
    controller: 'ConfigCtrl'
  }).when('/dictionaries', {
    templateUrl: 'public/html/dictionaries.html',
    controller: 'DictCtrl'
  })
});

// Свежие новости
nnm.controller('HotCtrl', ['$scope', '$http', function ($scope, $http) {
  // на сколько минут график
  $http.get('/public/public_config.json').
  success(function (data) {
    $scope.minutes = data.chart.minutes;
  }).
  error(function () {
    $scope.minutes = "ERROR";
  });
}]);

// Справочники
nnm.controller('DictCtrl', ['$scope', '$filter', 'Hosts', 'Groups', function ($scope, $filter, Hosts, Groups) {
  $scope.hosts = Hosts.query();
  $scope.groups = Groups.query();
  // для хостов
  $scope.showGroup = function (host) {
    var selected = $filter('filter')($scope.groups, {id: host.group_id});
    return selected.length ? selected[0].name : 'Не выбрано';
  };
  $scope.updateHost = function (host) {
    Hosts.save(host);
  };
  $scope.addHost = function (host) {
    var h = new Hosts(host);
    h.$save();
  }
}]);

// Навигация
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

// Factories 
nnm.factory('Hosts', ['$resource', function ($resource) {
  return $resource('/api/hosts/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Groups', ['$resource', function ($resource) {
  return $resource('/api/groups/:id', {id: '@id'}, {}); 
}]);
