// подключаем конфиг базы данных
require('js-methods');
var config = require("./config.json");
var public_config = require("./public/public_config.json");
var moment = require('moment');
var express = require('express');
var strftime = require('strftime');
var bodyParser = require("body-parser");
var fs = require("fs");
var _ = require("underscore");
var sys = require('sys');
var Q = require('q');
var exec = require('child_process').exec;
// для layout.ejs без этого не работает
var app = express();
// Для парсинга объекта request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
// адаптер для microsoft sql server
var sql = require('mssql');
// SQL Запросы
var queries = {
  hosts_with_group_name: "SELECT h.id, h.name, h.ip_or_name, h.group_id, g.name AS group_name FROM hosts AS h INNER JOIN groups AS g ON h.group_id = g.id ORDER BY h.id ASC",
  add_host: "INSERT INTO hosts (name, ip_or_name, group_id) VALUES ('%0','%1',%2)",
  select_types_of_host_and_port: "SELECT * FROM types_of_host_and_port ORDER BY id ASC",
  add_new_type_of_host_and_port: "INSERT INTO types_of_host_and_port (name) VALUES ('%0')",
  add_new_group: "insert into groups (name) values ('%0')",
  add_subscriber: "INSERT INTO subscribers (email) values ('%0')",
  hosts_and_ports: "SELECT hp.id, hp.name, hp.port, hp.host_id, hp.type_of_host_and_port_id, h.name AS hostname, t.name AS typename FROM hosts_and_ports AS hp INNER JOIN hosts AS h ON hp.host_id = h.id INNER JOIN types_of_host_and_port AS t ON hp.type_of_host_and_port_id = t.id",
  add_new_host_with_port: "INSERT INTO hosts_and_ports (host_id, port, name, type_of_host_and_port_id, route) VALUES (%0,%1,'%2',%3,'%4')",
  table: "SELECT * FROM %0 ORDER BY id ASC",
  groups: "SELECT * FROM groups ORDER BY id ASC",
  for_chart_on_single_host_ping: "SELECT p.period AS period, latency, h.name AS hostname FROM journal_of_ping_hosts INNER JOIN hosts AS h ON host_id = h.id INNER JOIN (SELECT top %0 * FROM periods where id <= (SELECT MAX(ID) FROM periods) ORDER BY id ASC) AS p ON period_id = p.id WHERE host_id = %1",
  all_ping_stats: "SELECT latency, h.name AS hostname FROM journal_of_ping_hosts INNER JOIN hosts AS h ON host_id = h.id INNER JOIN (SELECT top %0 * FROM periods where id BETWEEN %1 AND %2 ORDER BY id ASC) AS p ON period_id = p.id",
  id_period_maximum: "select max(id) from periods",
  get_latest_periods: "SELECT period from periods WHERE id BETWEEN %0 AND %1",
  get_subscribers: "SELECT id, email FROM subscribers",
  chart_for_group: "SELECT p.period AS period, latency, h.name AS hostname FROM journal_of_ping_hosts INNER JOIN (select * FROM hosts WHERE group_id = %0) AS h ON host_id = h.id INNER JOIN (SELECT top %1 * FROM periods where id <= (SELECT MAX(ID) FROM periods) ORDER BY id ASC) AS p ON period_id = p.id",
  select_last_n_entries: "DECLARE @max_id int = (SELECT MAX(id) FROM %0) DECLARE @min_id int = @max_id - %1 SELECT * FROM %0 WHERE id BETWEEN @min_id AND @max_id",
  select_ping_stat_for_host: "SELECT TOP 1000 period_id, latency FROM journal_of_ping_hosts WHERE host_id = %0",
  select_check_port_stat_for_host_and_port: "SELECT period_id, is_alive FROM journal_of_check_ports WHERE host_and_port_id = %0",
  get_latest_n_journal_of_ping_entries_about_host: "DECLARE @max_id int = (SELECT MAX(id) FROM periods) DECLARE @min_id int = @max_id - %0 select top %0 j.latency as latency, p.period AS period from (SELECT * FROM journal_of_ping_hosts WHERE period_id BETWEEN @min_id AND @max_id) AS j INNER JOIN periods AS p ON j.period_id = p.id where j.host_id = %1",
  get_begin_or_end_day_period_id: "SELECT top 1 * FROM periods WHERE period >= '%0'",
  get_latest_ping_data: "DECLARE @max_id int = (SELECT MAX(period_id) FROM journal_of_ping_hosts) DECLARE @min_id int = @max_id - %0 select j.latency as latency, p.period AS period, host_id from (SELECT * FROM journal_of_ping_hosts WHERE period_id BETWEEN @min_id AND @max_id) AS j INNER JOIN periods AS p ON j.period_id = p.id",
  get_all_today_periods: "SELECT id FROM periods WHERE period BETWEEN '%0' AND '%1'",
  select_hp_ids_agents: "SELECT hp.id AS id, hp.host_id AS host_id, h.group_id AS group_id FROM hosts_and_ports AS hp INNER JOIN hosts AS h ON hp.host_id = h.id WHERE hp.type_of_host_and_port_id = 3",
  select_latest_agents_and_periods_for_agent: "DECLARE @max_id int = (SELECT MAX(period_id) FROM agents_and_periods) DECLARE @min_id int = @max_id - %0 SELECT id, period_id FROM agents_and_periods WHERE period_id BETWEEN @min_id AND @max_id AND host_and_port_agent_id = %1",
  select_cpu_mem_load_for_agent: "SELECT cpu_load, free_mem FROM agents_cpu_mem_load WHERE agent_and_period_id IN (%0)",
  select_interfaces_stat: "SELECT interface_id, upload, download FROM interfaces_stat_journal WHERE agent_and_period_id IN (%0)",
  select_this_periods: "SELECT * FROM periods WHERE id IN (%0)",
  update_table_field_string_value_with_id: "UPDATE %0 SET %1 = '%2' WHERE id = %3",
  update_table_field_int_value_with_id: "UPDATE %0 SET %1 = %2 WHERE id = %3",
  delete_from_table_with_this_id: "DELETE FROM %0 WHERE id=%1",
  select_latest_n_periods: "DECLARE @max_id int = (SELECT MAX(id) FROM periods) DECLARE @min_id int = @max_id - %0 SELECT id, period FROM periods WHERE id BETWEEN @min_id AND @max_id",
  select_cpu_mem_load_till_period_from_period_for_agent: "SELECT cpu_load, free_mem, period_id FROM agents_cpu_mem_load WHERE (period_id BETWEEN %0 AND %1) AND agent_id = %2",
  select_interfaces_stat_till_period_from_period_for_agent: "SELECT interface_id, upload, download, period_id FROM interfaces_stat_journal WHERE (period_id BETWEEN %0 and %1) AND agent_id = %2",
  select_hdd_partitions_stat_till_period_from_period_for_agent: "SELECT hdd_partition_id, size, period_id FROM hdd_stat_journal WHERE (period_id BETWEEN %0 AND %1) AND agent_id = %2",
  select_latest_ping_stat_till_period_from_period: "SELECT host_id, latency, period_id FROM journal_of_ping_hosts WHERE period_id BETWEEN %0 AND %1",
  select_latest_ping_stat_till_period_from_period_for_host: "SELECT host_id, latency, period_id FROM journal_of_ping_hosts WHERE period_id BETWEEN %0 AND %1 AND host_id = %2",
  select_periods_from_between_ids: "SELECT * FROM periods WHERE id BETWEEN %0 AND %1",
  select_all_from: "SELECT * FROM %0",
  select_by_id: "SELECT * FROM %0 WHERE id=%1",
  insert_record: "INSERT INTO %0 (%1) VALUES (%2)",
  delete_record: "DELETE FROM %0 WHERE id=%1",
  edit_record: "UPDATE %0 SET %1 WHERE id=%2",
  get_last_record: "SELECT TOP 1 * FROM %0 ORDER BY ID DESC",
  check_db_connection: "SELECT TOP 1 * FROM groups",
  get_ping_stats_from_till_period_for_hosts: "SELECT host_id, latency, period_id FROM journal_of_ping_hosts WHERE period_id BETWEEN %0 AND %1 AND host_id IN (%2)",
  agents: "SELECT * FROM hosts_and_ports WHERE type_of_host_and_port_id=3" 
}

var html_folder = __dirname + '/public/html/';
// подлючение к базе данных
var connection = new sql.Connection(config);
connection.connect(function(err){
  err ? console.log(err) : console.log("db connection established");
});

var conf = {};

// хелперы

function setPeriodForPeriodId(array, periods_array){
  _.map(array, function(e){
    e.date = new Date((_.findWhere(periods_array, { "id": e.period_id} )).period);
    //e.date = moment.format(e.date, )
  });
}; 

// получить все данные из таблицы
function queryAll (query) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  q.query(query, function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
//получить запись с ид
function queryById (query, table, id) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  q.query(query.format([table, id]), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
// внести запись
function createRecord (query, table, values) {
  var deferred = Q.defer();
  var _v = _.values(values);
  var s = "";
  _.each(_v, function (e, i) {
    if (!_.isFinite(e)) 
      s = s + "'" + e + "'";
    else 
      s = s + parseInt(e);
    (_.size(_v) - 1 == i) ? s : s = s + ","
  });
  var q = new sql.Request(connection);
  console.log(query.format([table, _.keys(values).join(), s]));
  q.query(query.format([table, _.keys(values).join(), s]), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
// удалить запись
function deleteRecord (query, table, id) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  console.log(query.format([table, id]));
  q.query(query.format([table, id]), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
// обновить
function updateRecord (table, keys, values, id) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  var string_update = "";
  _.each(keys, function (k, i) {
    if (k != "id") {
      string_update = string_update + k + "=" + (_.isString(values[i]) ? "'" + values[i] + "'" : values[i]);
      (_.size(keys) - 1 == i) ? string_update : string_update = string_update + ",";
    };
  });
  console.log(queries.edit_record.format([table, string_update, id]));
  q.query(queries.edit_record.format([table, string_update, id]), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
// получить последнюю запись из таблицы
function getLast (query, table) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  q.query(query.format([table]), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};

// получить список периодов за последние Х минут
function getPeriodsForN (minutes) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  q.query((queries.select_latest_n_periods.format([minutes])), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};
// получить информацию о пинге с периода по период для хостов
function getPingData (from, to, hosts) {
  var deferred = Q.defer();
  var q = new sql.Request(connection);
  console.log((queries.get_ping_stats_from_till_period_for_hosts.format([from, to, hosts])));
  q.query((queries.get_ping_stats_from_till_period_for_hosts.format([from, to, hosts])), function (err, data) {
    if (err) deferred.reject(err)
    else deferred.resolve(data);
  });
  return deferred.promise;
};

// конец хелперов

// Установка движка для вьюшек и поддержка layout.ejs
// папка по умолчанию для public с маршрутом /public потому что IIS ><
app.use('/public', express.static(__dirname + '/public'));
// рутовая страница
app.get('/', function(req, res) {
  var fileContents = fs.readFileSync(html_folder + "index.html");
  res.send(fileContents.toString());
});
// Проверка - есть ли коннект к базе данных
app.get('/config/db_connection', function(req, res){
  var q = new sql.Request(connection);
  q.query(queries.check_db_connection, function (err, data) {
    _.isUndefined(err) ? res.send("OK") : res.send("DIED");
  });
});

// Проверка, работает ли служба ServiceNNM
app.get('/config/servicennm', function (req, res) {
  exec('sc query "pinger"', function (error, stdout, stderr) {
    if (stdout.indexOf("RUNNING") != -1)
      res.send("RUNNING");
    else if (stdout.indexOf("STOPPED") != -1)
      res.send("STOPPED");
    else
      res.send("NOTEXIST");
  });
});

//Сохранить изменения в конфигурации
app.post('/config/save/:configname', function (req, res) {
  var configname = req.params.configname;
  var json_config = JSON.stringify(req.body, null, 2);
  if (configname == 'webnnm') {
    fs.writeFile('./config.json', json_config, function (err) {
      if (err)
        res.send(err);
      else
        res.send('OK');
    });
  }
  else {
    fs.writeFile(conf.webnnm['path_to_servicennm_config'], json_config, function (err) {
      if (err)
        res.send(err);
      else
        res.send('OK');
    });
  }
});

// остановить/запустить службу
app.get('/config/servicennm/:whattodo', function (req, res) {
  var whattodo = req.params.whattodo; 
  if (whattodo == "stop" || whattodo == "start") {
    exec('net ' + whattodo + ' "pinger"', function (error, stdout, stderr) {
      _.size(stdout) > 0 ? res.send("OK") : res.send("ERROR");
    });
  } 
  else {
    res.send("ERROR");
  }
});

app.get('/config/', function (req, res) {
  conf.webnnm = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
  if (fs.existsSync(conf.webnnm['path_to_servicennm_config'])) conf.servicennm = JSON.parse(fs.readFileSync(conf.webnnm['path_to_servicennm_config'], 'utf8'));
  res.send(conf);
});

// api для получения данных
// получить все записи из таблицы
app.get('/api/:table', function (req, res) {
  queryAll(queries.select_all_from.format([req.params.table])).then(function (data) {
    res.send(data);
  }, function (err) {
    res.send(err);
  });
});
// получить запись по ид
app.get('/api/:table/:id', function (req, res) {
  var table = req.params.table;
  var id = req.params.id;
  queryById(queries.select_by_id, table, id).then(function (data) {
    res.send(data);
  }, function (err) {
    res.send(err);
  });
})
// добавить запись
app.post('/api/:table', function (req, res) {
  var table = req.params.table;
  var values = req.body;
  console.log(values);
  createRecord(queries.insert_record, table, values).then(function (data) {
    res.sendStatus(200);
  }, function (err) {
    res.send(err);
  });
});
// удалить запись
app.delete('/api/:table/:id', function (req, res) {
  var table = req.params.table;
  var id = req.params.id;
  deleteRecord(queries.delete_record, table, id).then(function (data) {
    res.sendStatus(200);
  }, function (err) {
    res.send(err);
  });
});
// обновить запись
app.post('/api/:table/:id', function (req, res) {
  var table = req.params.table;
  var id = req.params.id;
  updateRecord(table, _.keys(req.body), _.values(req.body), id).then(function (data) {
    res.sendStatus(200);
  }, function (err) {
    res.send(err);
  });
})
// получить последнюю запись
app.get('/extra/api/last/:table', function (req, res) {
  getLast(queries.get_last_record, req.params.table).then(function (data) {
    res.send(data);
  }, function (err) {
    res.send(err);
  })
});
// получить статистику пинга, список id хостов передается как 1&2&3
app.get('/extra/api/ping/:hosts', function (req, res) {
  var hosts = [];
  _.each(req.params.hosts.split('&'), function (e) {
    hosts.push(parseInt(e));
  });
  var hosts_int = hosts;
  var hosts_string = hosts.join();
  var start_date = req.body.from;
  var end_date = req.body.till;
  var response = {};
  var periods_ids = [];
  var q = new sql.Request(connection);
  var periods;
  // Сначала получим таблицу с хостами
  q.query(queries.select_all_from.format(['hosts']), function (err, _hosts) {
    hosts = _hosts;
    // теперь будет разветвление на то, если не указаны даты начала и конца, и если указаны
    if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
      q.query(queries.select_latest_n_periods.format([public_config.chart.minutes]), function (err, _periods) {
        periods = _periods;
        periods_ids = _.pluck(periods, "id");
        //console.log(err);
        q.query(queries.get_ping_stats_from_till_period_for_hosts.format([_.first(periods_ids), _.last(periods_ids), hosts_string]), function (err, _ping_data) {
          //console.log(err);
          // найдем недостающие периоды
          var ping_data = _ping_data;
          var missed_periods = {};
          _.each(hosts_int, function (host) {
           var m = _.where(ping_data, {host_id: host});
           if (_.size(m) != 0)
             missed_periods[host] = _.difference(periods_ids, _.pluck(m, "period_id"));
          });
          // теперь добавим недостающие периоды, если они есть
          _.each(missed_periods, function (missed, host_id) {
           _.each(missed, function (m) {
             ping_data.push({host_id: host_id, latency: null, period_id: m});
           });
          });
          // отсортируем по period_id
          ping_data = _.sortBy(ping_data, "period_id");
          // заменить 0 на null, чтобы были разрывы в графике
          _.each(ping_data, function(p){
             if (p.latency == 0) { p.latency = null };
          });
          // заменить period_id на полноценную дату
          //setPeriodForPeriodId(ping_data, periods);
          var grouped_by_host_id = _.groupBy(ping_data, 'host_id');
          var host_and_latency = {};
          var hostname_and_latencies = [];
          // создадим массив с периодами, тот, что по оси Х
          var periods_array = ['periods'];
          _.each(periods, function (p) {
            periods_array.push(strftime("%Y-%m-%dT%H:%M:%S", p.period));
          });
          // заменим host_id на полноценное имя
          _.each(grouped_by_host_id, function (v, k) {
            var hostname = _.findWhere(hosts, {id: parseInt(k)}).name;
            host_and_latency[hostname] = [];
            _.each(v, function (val) {
              //console.log(val);
              host_and_latency[hostname].push(val['latency']);
            });
          });
          // создадим формат, который требует c3js ["hostname", 20, 30, 30....]
          _.each(host_and_latency, function (v, k) {
            var tmp_key = [k];
            var tmp = tmp_key.concat(v);
            hostname_and_latencies.push(tmp);
          });
          hostname_and_latencies.push(periods_array);
          res.send(hostname_and_latencies);
        });
      });
    }
    else {

    }
  });
});

// получить информацию для агентов
app.get('/extra/api/agent/:id', function (req, res) {
  // body...
});

app.get('/extra/api/get_agents_ids', function (req, res) {
  queryAll(queries.agents).then(function (data) {
    res.send(data);
  });
});

  // // Если стартовая и последующие даты не указаны
  // if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
  //   getPeriodsForN(public_config.chart.minutes - 1).
  //   then(function (_p) {
  //     var periods = _p; 
  //     periods_ids = _.pluck(_p, "id");
  //     getPingData(_.first(periods_ids), _.last(periods_ids), hosts).
  //     then(function (_p_d) {
  //       var ping_data = _p_d;
  //       var missed_periods = {};
  //       // найдем недостающие периоды
  //       _.each(hosts_int, function (host) {
  //         var m = _.where(ping_data, {host_id: host});
  //         if (_.size(m) != 0)
  //           missed_periods[host] = _.difference(periods_ids, _.pluck(m, "period_id"));
  //       });
  //       // теперь необходимо заполнить добавить недостающие периоды  и null
  //       _.each(missed_periods, function (missed, host_id) {
  //         _.each(missed, function (m) {
  //           ping_data.push({host_id: host_id, latency: null, period_id: m});
  //         });
  //       });
  //       // отсортируем по period_id
  //       ping_data = _.sortBy(ping_data, "period_id");
  //       // заменить 0 на null, чтобы были разрывы в графике
  //       _.each(ping_data, function(p){
  //         if (p.latency == 0) { p.latency = null };
  //       });
  //       var by_host_id = _.groupBy(ping_data, 'host_id');
  //       var fin = {};
  //       _.each(by_host_id, function (v, k) {
  //         //console.log(k);
  //         //console.log(v);
  //           fin[k] = [];
  //         _.each(v, function (val) {
  //           console.log(val);
  //           fin[k].push(val['latency']);
  //         });
          
  //       });
  //       var f = [];
  //       _.each(fin, function (val, key) {

  //         _.each(val, function (elm) {
            
  //         })
          
  //       });
        
  //       // заменим period_id часами и минутами
  //       //setPeriodForPeriodId(ping_data, "%H:%M", periods);

  //       res.send(fin);
  //       //res.send(ping_data);
  //     })
  //   }, 
  //   function (err) {
  //     console.log(err);
  //   });
  // }
  // else {

  // }
//});



// app.post('/extra/api/ping/:hosts', function (req, res) {
//   var hosts = [];
//   _.each(req.params.hosts.split('&'), function (e) {
//     hosts.push(parseInt(e));
//   });
//   var hosts_int = hosts;
//   hosts = hosts.join();
//   var start_date = req.body.from;
//   var end_date = req.body.till;
//   var response = {};
//   var periods_ids = [];
//   // Если стартовая и последующие даты не указаны
//   if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
//     getPeriodsForN(public_config.chart.minutes - 1).
//     then(function (_p) {
//       var periods = _p; 
//       periods_ids = _.pluck(_p, "id");
//       getPingData(_.first(periods_ids), _.last(periods_ids), hosts).
//       then(function (_p_d) {
//         var ping_data = _p_d;
//         var missed_periods = {};
//         // найдем недостающие периоды
//         _.each(hosts_int, function (host) {
//           var m = _.where(ping_data, {host_id: host});
//           if (_.size(m) != 0)
//             missed_periods[host] = _.difference(periods_ids, _.pluck(m, "period_id"));
//         });
//         // теперь необходимо заполнить добавить недостающие периоды  и null
//         _.each(missed_periods, function (missed, host_id) {
//           _.each(missed, function (m) {
//             ping_data.push({host_id: host_id, latency: null, period_id: m});
//           });
//         });
//         // отсортируем по period_id
//         ping_data = _.sortBy(ping_data, "period_id");
//         // заменить 0 на null, чтобы были разрывы в графике
//         _.each(ping_data, function(p){
//           if (p.latency == 0) { p.latency = null };
//         });
//         var by_host_id = _.groupBy(ping_data, 'host_id');
//         var fin = {};
//         _.each(by_host_id, function (v, k) {
//           //console.log(k);
//           //console.log(v);
//             fin[k] = [];
//           _.each(v, function (val) {
//             console.log(val);
//             fin[k].push(val['latency']);
//           });
          
//         });
//         var f = [];
//         _.each(fin, function (val, key) {

//           _.each(val, function (elm) {
            
//           })
          
//         });
        
//         // заменим period_id часами и минутами
//         //setPeriodForPeriodId(ping_data, "%H:%M", periods);

//         res.send(fin);
//         //res.send(ping_data);
//       })
//     }, 
//     function (err) {
//       console.log(err);
//     });
//   }
//   else {

//   }
// });


// получить последнюю информацию о пинге для всех хостов
// app.get('/latest/ping/all', function(req, res){
//   var q = new sql.Request(connection);
//   q.query(queries.get_latest_ping_data.format([public_config.chart.minutes]), function(err, entries){
//     res.send(entries);
//   });
// });
// Получить статистику по одному хосту
// app.get('/stat/single/:type/:id', function (req, res) {
//   var id = req.params.id;
//   var type = req.params.type;
//   var result_stat_ping = { "id_periods_when_it_is_down": [], "count": 0, "avg_latency": 0, "times_of_down": 0 };
//   var result_stat_ports = { "id_periods_when_it_is_down": [], "count": 0, "times_of_down": 0 }
//   var ping_data = 0;
//   // если статистика по пингу
//   if (type == 'ping') {
//     var q = new sql.Request(connection);
//     q.query(queries.select_ping_stat_for_host.format([id]), function (err, entries) {
//       entries.forEach(function(e){
//         if (e.latency == 0) {
//           result_stat_ping['id_periods_when_it_is_down'].push(e.period_id);
//         };
//         ping_data += e.latency;
//       });
//       result_stat_ping['count'] = entries.length;
//       result_stat_ping['times_of_down'] = result_stat_ping['id_periods_when_it_is_down'].length;
//       result_stat_ping['avg_latency'] = parseInt(ping_data / result_stat_ping['count']);
//       res.send(result_stat_ping);
//     });
//   }
//   // Если статистика по портам
//   else if (type == 'check_port') {
//     var q = new sql.Request(connection);
//     q.query(queries.select_check_port_stat_for_host_and_port.format([id]), function (err, entries) {
//       console.log(err);
//       entries.forEach(function(e){
//         if (e.is_alive == false) {
//           result_stat_ports["id_periods_when_it_is_down"].push(e.period_id);
//         };
//       });
//       result_stat_ports['count'] = entries.length;
//       result_stat_ports['times_of_down'] = result_stat_ports['id_periods_when_it_is_down'].length;
//       console.log(result_stat_ports);
//       res.send(result_stat_ports);
//     });
//   }
// });

// // получить данные из таблицы в json
// app.get('/get/:table', function(req, res) {
//   //var tables = ["interfaces", "periods" ];
//   var table_name = req.params.table;
//   var q = new sql.Request(connection);
//   if (table_name.indexOf(' ') == -1) {
//     if (_.include(public_config.tables, table_name)) {
//       q.query(queries.table.format([table_name]), function(err, entries) {
//         res.send(entries);
//       });
//     } else {
//       q.query("SELECT * FROM memory", function(err, entries){
//         res.send(entries);
//       });
//     }
//   } else {
//     res.sendStatus(404);
//   }
// });






// // получаем последнюю статистику за последние 30 минут для определенного агента 
// app.get("/agents/stat/latest/:id", function(req, res){
//   var agent_id = req.params.id;
//   var response = {};
//   response[agent_id] = {};
//   var q = new sql.Request(connection);
//   q.query(queries.table.format(["hdd_partitions"]), function(err, hdd_partitions){
//     q.query(queries.select_latest_n_periods.format([(public_config.chart.minutes - 1)]), function(err, p_data){
//       var latest_periods = _.pluck(p_data, "id");
//       var periods_range_and_agent_id = [_.first(latest_periods), _.last(latest_periods), agent_id];
//       q.query(queries.select_cpu_mem_load_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, cpu_mem_data){
//         //теперь нужно найти каких периодов нет в cpu_mem_data и вставить значения
//         var missed_periods = _.difference(latest_periods, _.pluck(cpu_mem_data, "period_id"));
//         if (!_.isEmpty(missed_periods)) {
//           _.each(missed_periods, function(p){
//             cpu_mem_data.push({ "cpu_load": null, "free_mem": null, "period_id": p });
//           });
//         };
//         // заменим period_id на нормальную дату 
//         setPeriodForPeriodId(cpu_mem_data, "%H:%M", p_data);
//         response[agent_id]["cpu_mem"] = cpu_mem_data;
//         q.query(queries.select_interfaces_stat_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, interface_stat_data) {
//           // снова найдем в interface_stat_data каких периодов нет, и вставим их
//           var missed_periods_for_interface = _.difference(latest_periods, _.pluck(interface_stat_data, "period_id"));
//           var grouped_interfaces = _.groupBy(interface_stat_data, function(i){ return i.interface_id });
//           if (!_.isEmpty(missed_periods_for_interface)) {
//             _.each(grouped_interfaces, function(i){
//               _.each(missed_periods_for_interface, function(p){
//                 i.push({"upload": null, "download": null, "period_id": p });
//               });
//             });
//           };
//           // заменим period_id на нормальную дату 
//           _.each(grouped_interfaces, function(i){
//             setPeriodForPeriodId(i, "%H:%M", p_data);
//           });
//           response[agent_id]["interfaces_stat"] = grouped_interfaces;
//           // выбирай статистику для разделов
//           q.query(queries.select_hdd_partitions_stat_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, partitions_stat_data){
//            // !сделать единый метод для вставки недостающих, добавить сортировку по периоду.
//             var missed_periods_for_disks = _.difference(latest_periods, _.pluck(partitions_stat_data, "period_id"));
//             var grouped_partitions = _.groupBy(partitions_stat_data, function(p){ return p.hdd_partition_id });
//             if (!_.isEmpty(missed_periods_for_disks)) {
//               _.each(grouped_partitions, function(p){
//                 _.each(missed_periods_for_disks, function(missed_p){
//                   p.push({ "size": null, "period_id": missed_p });
//                 });
//               });
//             };
//             _.each(grouped_partitions, function(p){
//               setPeriodForPeriodId(p, "%H:%M", p_data);
//             });
//             response[agent_id]["partitions_stat"] = grouped_partitions;
//             res.send(response);
//           });
//         });
//       });
//     }); 
//   });
// });

app.listen(process.env.PORT || 80);