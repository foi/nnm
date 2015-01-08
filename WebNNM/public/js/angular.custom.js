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

// Factories 
nnm.factory('Hp', ['$resource', function ($resource) {
  return $resource('/api/hosts_and_ports/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Host', ['$resource', function ($resource) {
  return $resource('/api/hosts/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Group', ['$resource', function ($resource) {
  return $resource('/api/groups/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Service', ['$resource', function ($resource) {
  return $resource('/api/services/:id', {id: '@id'}, {}); 
}]);

nnm.factory('TPHP', ['$resource', function ($resource) {
  return $resource('/api/types_of_host_and_port/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Subscriber', ['$resource', function ($resource) {
  return $resource('/api/subscribers/:id', {id: '@id'}, {}); 
}]);

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
nnm.controller('DictCtrl', ['$scope', '$filter', 'Host', 'Group', 'Hp', 'Service', 'TPHP', 'Subscriber', function ($scope, $filter, Host, Group, Hp, Service, TPHP, Subscriber) {
  $scope.show = {
    hosts: true,
    groups: false,
    hp: false, 
    services: false,
    subscribers: false
  };

  $scope.hosts = Host.query();
  $scope.groups = Group.query();
  $scope.services = Service.query();
  $scope.hosts_and_ports = Hp.query();
  $scope.types = TPHP.query();
  $scope.subscribers = Subscriber.query();
  // для хостов
  $scope.showGroup = function (host) {
    var selected = $filter('filter')($scope.groups, {id: host.group_id});
    return selected.length ? selected[0].name : 'Не выбрано';
  };
  $scope.updateHost = function (host) {
    Host.save(host);
  };
  $scope.addHost = function (host) {
    Host.save(host, function () {
      $scope.hosts = Host.query();
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteHost = function (id) {
    Host.delete({id: id}, function () {
      $scope.hosts = Host.query();
    }, function (err) {
      console.log(err);
    });
  };
  // для групп
  $scope.addGroup = function (group) {
    Group.save(group, function () {
      $scope.groups = Group.query();
    }, function (err) {
      console.log(err);
    });
  };
  $scope.updateGroup = function (group) {
    Group.save(group);
  };
  $scope.deleteGroup = function (id) {
    Group.delete({id: id}, function () {
      $scope.groups = Group.query();
    }, function (err) {
      console.log(err);
    });
  };
  // для сервисов
  $scope.updateService = function (service) {
    Service.save(service);
  };
  $scope.deleteService = function (id) {
    Service.delete({id: id}, function () {
      $scope.hosts = Service.query();
    }, function (err) {
      console.log(err);
    });
  };
  // для хостов с портами
  $scope.showHost = function (host_id) {
    var selected = $filter('filter')($scope.hosts, {id: host_id});
    return selected.length ? selected[0].name : 'Не выбрано';
  };
  $scope.showType = function (type_id) {
    var selected = $filter('filter')($scope.types, {id: type_id});
    return selected.length ? selected[0].name : 'Не выбрано';
  };
  $scope.updateHp = function (hp) {
    Hp.save(hp);
  };
  $scope.addHp = function (hp) {
    Hp.save(hp, function () {
      $scope.hosts_and_ports = Hp.query();
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteHp = function (id) {
    Hp.delete({id: id}, function () {
      $scope.hosts_and_ports = Hp.query();
    }, function (err) {
      console.log(err);
    });
  };
  //для подписунов
  $scope.updateSubscriber = function (s) {
    Subscriber.save(s);
  };
  $scope.addSubscriber = function (subscriber) {
    Subscriber.save(subscriber, function () {
      $scope.subscribers = Subscriber.query();
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteSubscriber = function (id) {
    Subscriber.delete({id: id}, function () {
      $scope.subscribers = Subscriber.query();
    }, function (err) {
      console.log(err);
    });
  };
}]);

nnm.controller('ConfigCtrl', ['$scope', function($scope){
  
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