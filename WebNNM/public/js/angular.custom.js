"use strict";

var nnm = angular.module('nnm', ['ngRoute', 'ngResource', 'xeditable', 'ui.bootstrap']);

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

nnm.factory('Agents', ['$http' ,function ($http) {
  return {
    getAgentsIds: function () {
      return $http.get('/extra/api/get_agents_ids').then(function (data) {
        return data.data;
      })
    },
    getAgentData: function (i) {
      return $http.get('/extra/api/agents/' + i).then(function (data) {
        return data.data;
      })
    }  
  };
}])
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
 
// Свежие новости
nnm.controller('HotCtrl', ['$scope', '$http','$rootScope', 'Host', 'Agents', function ($scope, $http, $rootScope, Host, Agents) {
  // на какое время график
  $http.get('/public/public_config.json').
  success(function (data) {
    $scope.minutes = data.chart.minutes;
  }).
  error(function () {
    $scope.minutes = "ERROR";
  });
  $scope.ping_chart_data = { 
    data: {
      x: "periods",
      xFormat: "%Y-%m-%dT%H:%M:%S",
      columns: [],
      type: 'spline'
    },
    padding: { right: 50 },
    axis: {
      x: {
        type: 'timeseries',
        localtime: true,
        tick: {
          fit: false,
          format: "%H:%M"
        }
      },
      y: {
        min: 0
      }
    },
    point: {
      show: false
    },
    tooltip: {
      show: true
    },
    size: {
      height: 300
    }
  };
  $scope.agent_cpu_chart_default = angular.copy($scope.ping_chart_data);
  $scope.agent_cpu_chart_default["tooltip"]["show"] = false;
  $scope.agent_cpu_chart_default["size"]["height"] = 200
  $scope.load_ping_data_chart = function () {
    Host.query(function (data) {
      var hosts = [];
      angular.forEach(data, function (e) {
        hosts.push(e.id);
      });
      $http.get('/extra/api/ping/' + hosts.join('&')).success(function (ping_data) {
        $scope.ping_chart_data.data.columns = ping_data;
      });
    }, function (err) {
      console.log(err);
    });
  };
  // Загрузить таблицу с агентами
  $scope.load_agents = function () {
    Agents.getAgentsIds().then(function (data) {
      $scope.agents = data;
    });
  };
  // получить данные об агенте
  $scope.getAgentData = function (i) {
    Agents.getAgentData(i).then(function (data) {
      //  график с загрузкой процессора
      $scope.agent_cpu_chart = angular.copy($scope.agent_cpu_chart_default);
      $scope.agent_cpu_chart["axis"]["y"]["max"] = 90;
      $scope.agent_cpu_chart.data.columns = data[i]["cpu_load"];
      // данные для графика с размером оперативной памяти
      $scope.agent_mem_chart = angular.copy($scope.agent_cpu_chart_default);
      $scope.agent_mem_chart["axis"]["y"]["max"] = data[i]["memory_max"];
      $scope.agent_mem_chart.data.columns = data[i]["used_ram"];
    })
  };
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

// директива для графика пинга 
nnm.directive('pingChart', [function () {
  return {
    restrict: 'E',
    scope: { config: '=' },
    template: "<div></div>",
    link: function (scope, element, attrs) {
      scope.config.bindto = "#" + attrs.id;
      scope.$watch('config.data.columns', function(newSeries, oldSeries) {
        var chart = c3.generate(scope.config);
      });
    }
  };
}]);

nnm.directive('cpuChart', [function () {
  return {
    restrict: 'E',
    scope: {
      config: '='
    },
    link: function (scope, element, attrs) {
      scope.config.bindto = "#" + attrs.id;
      var chart;
      scope.$watch('config.data.columns', function(newSeries, oldSeries) {
        if (_.isUndefined(chart)) {
          chart = c3.generate(scope.config);
        }
        else {
          chart.flow({columns: newSeries, duration: 1});
        }
      });
    }
  };
}]);

nnm.directive('memChart', [function () {
  return {
    restrict: 'E',
    scope: {
      config: '='
    },
    link: function (scope, element, attrs) {
      scope.config.bindto = "#" + attrs.id;
      var chart;
      scope.$watch('config.data.columns', function(newSeries, oldSeries) {
        if (_.isUndefined(chart)) {
          chart = c3.generate(scope.config);
        }
        else {
          chart.flow({columns: newSeries, duration: 1});
        }
      });
    }
  };
}])