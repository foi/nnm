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
  }).when('/details', {
    templateUrl: 'public/html/details.html',
    controller: 'DetailsCtrl'
  })
});

// Factories 
nnm.factory('Hp', ['$resource', function ($resource) {
  return $resource('/api/table/hostswithports/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Host', ['$resource', function ($resource) {
  return $resource('/api/table/hosts/:id', {id: '@id'}); 
}]);

nnm.factory('Group', ['$resource', function ($resource) {
  return $resource('/api/table/groups/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Service', ['$resource', function ($resource) {
  return $resource('/api/table/services/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Type', ['$resource', function ($resource) {
  return $resource('/api/table/types/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Subscriber', ['$resource', function ($resource) {
  return $resource('/api/table/subscribers/:id', {id: '@id'}, {}); 
}]);

nnm.factory('Agents', ['$http' ,function ($http) {
  return {
    getAgentsIds: function () {
      return $http.get('/api/get_agents_ids').then(function (data) {
        return data.data;
      })
    },
    getAgentData: function (i) {
      return $http.get('/api/agents/' + i).then(function (data) {
        return data.data;
      })
    }  
  };
}]);
// контроллер отвечающий за страницу детальной статистика
nnm.controller('DetailsCtrl', ['$scope', 'Host', '$http', function ($scope, Host, $http) {
  $scope.get_hosts = function () {
    $scope.hosts = Host.query();
  }; 
  $scope.get_ping = function (start_date, end_date, checked_host) {
    console.log(start_date);
    console.log(end_date);
    $http.post('/api/ping/' + 1, {start_date: start_date, end_date: end_date}).success(function(data){
      console.log(data);
    }).error(function(err){console.log(err)});
  };
}]);

 
// Свежие новости
nnm.controller('HotCtrl', ['$scope', '$http','$rootScope', 'Host', 'Agents', function ($scope, $http, $rootScope, Host, Agents) {
  $scope.agents_data;
  var agent_index;
  // на какое время график
  $http.get('/api/hot').
  success(function (data) {
    $scope.minutes = data;
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
    grid: {
      y: {
        lines: []
      }
    },
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
        min: 0,
        tick: {

        }
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
  $scope.agent_cpu_chart_default["size"]["height"] = 200;
  $scope.load_ping_data_chart = function () {
    Host.query(function (data) {
      var hosts = [];
      angular.forEach(data, function (e) {
        hosts.push(e.id);
      });
      $http.get('/api/ping/' + hosts.join('&')).success(function (ping_data) {
        $scope.ping_chart_data.data.columns = ping_data;
        console.log(ping_data);
      });
    }, function (err) {
      console.log(err);
    });
  };
  // Загрузить таблицу с агентами
  $scope.load_agents = function () {
    Agents.getAgentsIds().then(function (data) {
      $scope.agents = data;
      console.log(data);
      var agent_ids = [];
      angular.forEach($scope.agents, function (v, k) {
        agent_ids.push(v.id);
      });
      agent_ids = agent_ids.join('&');
      // получим информацию сразу для всех агентов
      Agents.getAgentData(agent_ids).then(function (agents_data) {
        $scope.agents_data = agents_data;
        if (!angular.isUndefined(agent_index)) { $scope.getAgentData(agent_index) };
      });
    });
  };
  // получить данные об агенте
  $scope.getAgentData = function (i) {
    agent_index = i;
    $scope.agent_cpu_chart = angular.copy($scope.agent_cpu_chart_default);
    $scope.agent_cpu_chart["axis"]["y"]["max"] = 100;
    $scope.agent_cpu_chart["axis"]["y"]["tick"]["values"] = [0, 25, 50, 75, 100];
    $scope.agent_cpu_chart["axis"]["y"]["tick"]["format"] = function (x) { return x + "%" };
    $scope.agent_cpu_chart.data.columns = $scope.agents_data[i]["cpu_load"];
    // данные для графика с размером оперативной памяти
    $scope.agent_mem_chart = angular.copy($scope.agent_cpu_chart_default);
    $scope.agent_mem_chart["axis"]["y"]["max"] = $scope.agents_data[i]["memory_max"];
    // Линии для максимума памяти и свопа
    $scope.agent_mem_chart["grid"]["y"]["lines"].push({value: $scope.agents_data[i]["memory_max"], text: "максимум ОЗУ " + $scope.agents_data[i]["memory_max"] + " МБ"});
    $scope.agent_mem_chart["grid"]["y"]["lines"].push({value: $scope.agents_data[i]["swap_max"], text: "максимум SWAP " + $scope.agents_data[i]["swap_max"] + " МБ"});
    $scope.agent_mem_chart["axis"]["y"]["tick"]["format"] = function (x) { return x + " МБ" };
    $scope.agent_mem_chart.data.columns = $scope.agents_data[i]["used_ram"];
    $scope.agent_mem_chart.data.columns.push($scope.agents_data[i]["used_swap"][0]);
    $scope.partitions = $scope.agents_data[i]["partitions"];
    // // данные для графика с занятым объемов разделов жестких дисков
    // $scope.agent_partitions_chart = angular.copy($scope.agent_cpu_chart_default);
    // // найдем максимальный объем раздела, чтобы выставить максимум на графике
    // var maximum_partition_size = 0;
    // angular.forEach($scope.agents_data[i]["partitions_info"], function (v, k) {
    //   if (v.value > maximum_partition_size) maximum_partition_size = v.value;
    // }); 
    // $scope.agent_partitions_chart["axis"]["y"]["tick"]["format"] = function (x) { return x + " ГБ" };
    // $scope.agent_partitions_chart["size"]["height"] = 300;
    // $scope.agent_partitions_chart["axis"]["y"]["max"] = maximum_partition_size;
    // $scope.agent_partitions_chart["grid"]["y"]["lines"] = $scope.agents_data[i]["partitions_info"];
    // $scope.agent_partitions_chart.data.columns = $scope.agents_data[i]["partitions"];
    // теперь заполним инфу для графика, на которой будут отображаться данные интерфейсов
    $scope.agent_interfaces_chart = angular.copy($scope.agent_cpu_chart_default);
    $scope.agent_interfaces_chart["size"]["height"] = 300;
    $scope.agent_interfaces_chart["axis"]["y"]["tick"]["format"] = function (x) { return x + " кб/с" };
    $scope.agent_interfaces_chart["data"]["columns"] = $scope.agents_data[i]["interfaces_data"];
  };
}]);

// Справочники
nnm.controller('DictCtrl', ['$scope', '$filter', '$http', 'Host', 'Group', 'Hp', 'Service', 'Type', 'Subscriber', function ($scope, $filter, $http, Host, Group, Hp, Service, Type, Subscriber) {
  $scope.show = {
    hosts: true,
    groups: false,
    hp: false, 
    services: false,
    subscribers: false
  };

  var appendLast = function (table, scope) {
    return $http.get('/api/table/last/' + table).then(function (data) {
        scope.push(data.data);
      }, function (err) {
        console.log(err);
      }
    );
  };

  $scope.hosts = Host.query();
  $scope.groups = Group.query();
  $scope.services = Service.query();
  $scope.hostswithports = Hp.query();
  $scope.types = Type.query();
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
      appendLast('hostswithports', $scope.hostswithports);
    }, function (err) {
      console.log(err);
    });
  };
  $scope.deleteHp = function (id, idx) {
    Hp.delete({id: id}, function () {
      $scope.hostswithports.splice(idx, 1);
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
    $http.get('/config').then(function (data) {
      $scope.config = data["data"];
      console.log(data);
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

  $scope.saveConfig = function () {
    $http.post('/config', $scope.config).then(
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
  $http.get('/api/status/db').
  success(function (data) {
    data == "true" ? $rootScope.dbConnected = true : $rootScope.dbConnected = false;
  }).
  error(function (err) {
    console.log(err);
  });
  $http.get('/api/status/service').
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
    link: function (scope, element, attrs) {
      var chart;
      scope.config.bindto = "#" + attrs.id;
      scope.$watch('config.data.columns', function(newSeries, oldSeries) {
        if (chart == undefined) {
          chart = c3.generate(scope.config);
        }
        else {
          if (oldSeries) {
            var hostnames = [];
            angular.forEach(oldSeries, function (v) {
              hostnames.push(v[0]);
            });
            chart.load({columns: newSeries, duration: 100, unload: hostnames});
          } 
          else {
            chart.load({columns: newSeries, duration: 100 });
          }
        }
      });
    }
  };
}]);
// директира для графика cpu
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
      if (chart == undefined) {
        chart = c3.generate(scope.config);
      }
      else {
        if (oldSeries) {
          chart.load({columns: newSeries, duration: 100, unload: ["Загрузка ЦП %"]});
        }
        else {
          chart.load({columns: newSeries, duration: 100});
        }
      }
    });
    }
  };
}]);
// директива для графика объема занятой оперативной памяти
nnm.directive('memChart', [function () {
  return {
    restrict: 'E',
    scope: {
      config: '='
    },
    link: function (scope, element, attrs) {
      scope.config.bindto = "#" + attrs.id;
      var chart;
      scope.$watch('config', function(newD, old) {
        if (chart == undefined) {
          chart = c3.generate(scope.config);
        }
        else {
          if (old) {
            chart.axis.max({y: newD.axis.y.max});
            chart.load({columns: newD.data.columns, duration: 100, unload: ["Занято ОЗУ"]});
          } else {
            chart.axis.max({y: newD.axis.y.max});
            chart.load({columns: newD.data.columns, duration: 100});
          };
        }
      });
    }
  };
}]);
// директива для занятого места на разделах
nnm.directive('partitionsChart', [function () {
  return {
    restrict: 'E',
    scope: {
      config: "="
    },
    link: function (scope, element, attrs) {
      scope.config.bindto = "#" + attrs.id;
      var chart;
      scope.$watch('config', function(newSeries, oldSeries) { 
        if (chart == undefined) {
          chart = c3.generate(scope.config);
        }
        else {
          if (oldSeries) {
            // это для ывгрузки старых значений, а то бывает...
            var unload_partitions_names = [];
            angular.forEach(oldSeries.data.columns, function (value) {
              unload_partitions_names.push(value[0]);
            });
            chart.axis.max({y: newSeries.axis.y.max});
            chart.load({columns: newSeries.data.columns, duration: 100, unload: unload_partitions_names});
          } 
          else {
            chart.load({columns: newSeries.data.columns, duration: 100});
          }
          chart.ygrids(newSeries.grid.y.lines);
        }
      });
    }
  };
}]);
// директива для графика статистика интерфейсов
nnm.directive('interfacesChart', [function () {
  return {
    restrict: 'E',
    scope: { config: '=' },
    link: function (scope, element, attrs) {
      var chart;
      scope.config.bindto = "#" + attrs.id;
      scope.$watch('config.data.columns', function(newSeries, oldSeries) {
        if (chart == undefined) {
          chart = c3.generate(scope.config);
        }
        else {
          if (oldSeries) {
            var interfaces_names = [];
            angular.forEach(oldSeries, function (v) {
              interfaces_names.push(v[0]);
            });
            chart.load({columns: newSeries, duration: 100, unload: interfaces_names});
          } 
          else {
            chart.load({columns: newSeries, duration: 100 });
          }
        }
      });
    }
  };
}]);