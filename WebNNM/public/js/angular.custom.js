var nnm = angular.module('nnm', ['ngRoute', 'ngResource', 'xeditable']);

nnm.run(function(editableOptions, editableThemes) {
  editableThemes.bs3.inputClass = 'input-sm';
  editableThemes.bs3.buttonsClass = 'btn-sm';
  editableOptions.theme = 'bs3';
});

// фикс для ie
// http://stackoverflow.com/questions/16098430/angular-ie-caching-issue-for-http
nnm.config(['$httpProvider', function($httpProvider) {
    //initialize get if not there
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};    
    }
    //disable IE ajax request caching
    $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
}]);

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
  return $resource('/api/hosts/:id', {id: '@id'}, { last: { url: '/extra/api/last/hosts', method: 'GET', isArray: false }}); 
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

// nnm.service('ConfigService', ['$http' ,function ($http) {
//   this.get = function () {
//     $http.get('/config/').then(function (data) {
//       return data;
//     },
//     function (err) {
//       console.log(data);
//     })
//   } 
// }]);
// Директива для создания линейного графика
nnm.directive('LineChart', [function () {
  return {
    restrict: 'A',
    template: '<div id="linechart"></div>',
    scope: {
      data: '=',
      ykey: '=',
      xkey: '='
    }
    link: function (scope, iElement, iAttrs) {
      
    }
  };
}]) 
// Свежие новости
nnm.controller('HotCtrl', ['$scope', '$http', 'Host', function ($scope, $http, Host) {
  // на какое время график
  $http.get('/public/public_config.json').
  success(function (data) {
    $scope.minutes = data.chart.minutes;
  }).
  error(function () {
    $scope.minutes = "ERROR";
  });
  // получим имена хостов для labels на графике
  $scope.hot = { hostnames: []};
  Host.query(function (data) {
    angular.forEach(data, function (e) {
      $scope.hot.hostnames.push(e.name);
    });
  });
  
}]);

// Справочники
nnm.controller('DictCtrl', ['$scope', '$filter', '$http', 'Host', 'Group', 'Hp', 'Service', 'TPHP', 'Subscriber', function ($scope, $filter, $http, Host, Group, Hp, Service, TPHP, Subscriber) {
  $scope.show = {
    hosts: true,
    groups: false,
    hp: false, 
    services: false,
    subscribers: false
  };

  var appendLast = function (table, scope) {
    return $http.get('/extra/api/last/' + table).then(function (data) {
        scope.push(data.data[0]);
      }, function (err) {
        console.log(err);
      }
    );
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
      appendLast('hosts', $scope.hosts);
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteHost = function (id, idx) {
    Host.delete({id: id}, function () {
      $scope.hosts.splice(idx, 1);
    }, function (err) {
      console.log(err);
    });
  };
  // для групп
  $scope.addGroup = function (group) {
    Group.save(group, function (data) {
      appendLast('groups', $scope.groups);
    }, function (err) {
      console.log(err);
    });
  };
  $scope.updateGroup = function (group) {
    Group.save(group);
  };
  $scope.deleteGroup = function (id, idx) {
    Group.delete({id: id}, function () {
      $scope.groups.splice(idx, 1);
    }, function (err) {
      console.log(err);
    });
  };
  // для сервисов
  $scope.updateService = function (service) {
    Service.save(service);
  };
  $scope.deleteService = function (id, idx) {
    Service.delete({id: id}, function () {
      $scope.services.splice(idx, 1);
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
      appendLast('hosts_and_ports', $scope.hosts_and_ports);
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteHp = function (id, idx) {
    Hp.delete({id: id}, function () {
      $scope.hosts_and_ports.splice(idx, 1);
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
  $scope.deleteSubscriber = function (id, idx) {
    Subscriber.delete({id: id}, function () {
      $scope.subscribers.splice(idx, 1);
    }, function (err) {
      console.log(err);
    });
  };
}]);
// контроллер отвечающий за конфигурацию
nnm.controller('ConfigCtrl', ['$scope', '$http', '$rootScope', '$route', '$timeout', function($scope, $http, $rootScope, $route, $timeout){
  var isRunning = $rootScope.ServiceNNM == "RUNNING" ? true : false;

  $scope.getConfig = function () {
    $http.get('/config/').then(function (data) {
    $scope.webconfig = data['data']['webnnm'];
    $scope.serviceconfig = data['data']['servicennm'];
    },
    function (err) {
      console.log(err);
    });
  };

  $scope.startStopService = function () {
    if (isRunning) {
      $http.get('/config/servicennm/stop').success(function () {
        $rootScope.ServiceNNM = "STOPPED";
        $timeout($route.reload(), 3000);
      });
    }
    else {
      $http.get('/config/servicennm/start').success(function (data) {
        $rootScope.ServiceNNM = "RUNNING";
        $timeout($route.reload(), 3000);
      });
    };
  };

  $scope.saveConfig = function (configname) {
    $http.post('/config/save/' + configname, (configname == 'webnnm' ? $scope.webconfig : $scope.serviceconfig)).then(
      function (data) {
        console.log(data);
      },
      function (err) {
        console.log(err);
    });
  };
}]);

// Навигация
nnm.controller('NavCtrl', ['$rootScope','$scope', '$http', '$location', function ($rootScope, $scope, $http, $location) {
  $http.get('/config/db_connection').
  success(function (data) {
    data == "OK" ? $rootScope.dbConnected = true : $rootScope.dbConnected = false;
  }).
  error(function (err) {
    console.log(err);
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