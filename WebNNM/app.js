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
  agents: "SELECT * FROM hosts_and_ports WHERE id IN (%0)",
  agents_for_list: "SELECT * FROM hosts_and_ports WHERE type_of_host_and_port_id=3",
  select_cpu_mem_load_for_agents: "SELECT agent_id, cpu_load, free_mem, period_id  FROM agents_cpu_mem_load WHERE (period_id BETWEEN %0 AND %1) AND agent_id IN (%2)",
  select_hdd_part_stat: "SELECT agent_id, hdd_partition_id, size, period_id FROM hdd_stat_journal WHERE (period_id BETWEEN %0 AND %1) AND agent_id IN (%2)",
  select_interfaces_stat: "SELECT * FROM interfaces_stat_journal WHERE (period_id BETWEEN %0 AND %1) AND agent_id IN (%2)" 
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
  });
}; 
// получить ид из строки вида 1&2&3
function getIdsFromAndArray(str) {
  var tmp = [];
  _.each(str.split('&'), function (e) {
    tmp.push(parseInt(e));
  });
  return tmp;
};
// заменить 0 на null во вложенной коллекции
function changeZerosOnNull(collection, nullify_field) {
  _.each(collection, function (v, k) {
    _.each(v, function (p) {
      if (p[nullify_field] == 0) { p[nullify_field] = null };
    });
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
  var hosts = getIdsFromAndArray(req.params.hosts);
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

app.get('/extra/api/get_agents_ids', function (req, res) {
  queryAll(queries.agents_for_list).then(function (data) {
    res.send(data);
  });
});
// получить имя агента исходя из его ид
function getAgentNameFromId(agents, id) {
  return _.findWhere(agents, {id: id}).name;
};
// получить ид агента исходя из его имени
function getIdFromAgentName(agents, name) {
  return _.findWhere(agents, {name: name}).id;
};

// формирование информации об агентах
function agentsStatFormat(agents_string, agents, hdds, interfaces, memory, periods, q, response) {
  var full_response = {};
  var periods = periods;
  var periods_ids = _.pluck(periods, "id");
  var partitions_size_name = {};
  // ответ будет следующего формата вставить сслыку на гист гитхаба

  // сначала соберем информацию о процессоре и оперативке и о потеряных периодах
  q.query(queries.select_cpu_mem_load_for_agents.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, cpmem) {
    var missed_periods = {}; // потерянные периоды
    var periods_readable = ["periods"];
    // создадим строки даты/времени 
    _.each(periods, function (p) {
      periods_readable.push(strftime("%Y-%m-%dT%H:%M:%S", p.period));
    });
    _.each(_.pluck(agents, "id"), function (e) {
      var agents_cpu_mem = _.where(cpmem, {agent_id: e});
      if (_.size(agents_cpu_mem) != 0)
        missed_periods[e] = _.difference(periods_ids, _.pluck(agents_cpu_mem, "period_id"));
    });
    _.each(missed_periods, function (v, k) {
      if (!_.isEmpty(missed_periods[k])) {
        _.each(missed_periods[k], function (p) {
          cpmem.push({"cpu_load": null, "free_mem": null, "agent_id": parseInt(k), "period_id": p});
        });
      };
    });
    cpmem = _.sortBy(cpmem, "period_id");
    // набьем данные в финальный ответ для статистики цпу и памяти, а также добавим сколько всего оперативки, и макс на разделе места 
    cpmem = _.groupBy(cpmem, "agent_id");
    _.each(cpmem, function (v, k) {
      full_response[k] = { "cpu_load": [], "used_ram":[]};
      var cpu = ["загрузка %"].concat(_.pluck(v, "cpu_load"));
      var mem = ["занято МБ"].concat(_.pluck(v, "free_mem"));
      full_response[k]["cpu_load"][0] = cpu;
      full_response[k]["cpu_load"][1] = periods_readable;
      full_response[k]["used_ram"][0] = mem;
      full_response[k]["used_ram"][1] = periods_readable;
      full_response[k]["memory_max"] = _.findWhere(memory, {"host_and_port_agent_id": parseInt(k)}).memory_overall;
      // ага, еще для разделов ветка
      full_response[k]["partitions"] = [];
      // Считаем размеры разделов накопителей
      var _hdds = _.where(hdds, {"host_and_port_agent_id": parseInt(k)});
      var hdd_names_and_space = {};
      _.each(_hdds, function (h) {
        hdd_names_and_space[h['id']] = { size: h['total_space'], name: h['partition_letter'] };
      });
      full_response[k]["partitions_info"] = hdd_names_and_space;
      partitions_size_name[k] = hdd_names_and_space;
      // теперь соберем информацию о разделах
      q.query(queries.select_hdd_part_stat.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, hdd_part_stat) {
        var g_partitions = _.groupBy(hdd_part_stat, 'agent_id');
        // заменим размер, если он 0 на null, а также заменим ид партишна на его букву
        changeZerosOnNull(g_partitions, "size");
        // еще более сгруппированные данные разделов
        var g_f_partitions = {};
        // добавим недостающие периоды и причешем данные в тот формат, что требует c3js
        _.each(missed_periods, function (v, k) {
          if (!_.isEmpty(missed_periods[k])) {
            _.each(missed_periods[k], function (p) {
              var uniq_ids = _.keys(full_response[k]["partitions_info"]);
              _.each(uniq_ids, function (p_id) {
                g_partitions[k].push({"agent_id": k, "size": null, "hdd_partition_id": p_id, "period_id": p});
              });
            });
            g_partitions[k] = _.sortBy(g_partitions[k], "period_id"); // упорядочиваем по period_id
          };
          // заменим hdd_partitions_id на "c:\ (465гб)"
          _.each(g_partitions[k], function (vh) {
            var name = "%0 (%1ГБ)".format([partitions_size_name[k][vh["hdd_partition_id"]].name, partitions_size_name[k][vh["hdd_partition_id"]].size]);
            vh["partition_name"] = name;
          });
          // теперь необходимо сгруппировать по partition_name
          g_f_partitions[k] = _.groupBy(g_partitions[k], "partition_name");
          // свернем до такого состояния [c:\, 1,2,3,4,], [d:\, 3,43,5]
          _.each(g_f_partitions[k], function (vh, vk) {
            var tmp = [vk];
            _.each(vh, function (value) {
              tmp.push(value['size']);
            }); 
            full_response[k]["partitions"].push(tmp);
          });
          // добавим массив с датами
          full_response[k]["partitions"].push(full_response[k]["cpu_load"][1]);
          // теперь преобразуем "partitions_info" в тот вид, который требует c3js для грида
          var partitions_info = [];
          _.each(full_response[k]["partitions_info"], function (vh, vk) {
            partitions_info.push({value: vh['size'], text: ("предел на " + vh['name'])});
          });
          full_response[k]["partitions_info"] = partitions_info;
        });
        // теперь будем считывать информацию об интерфейсах 
        q.query(queries.select_interfaces_stat.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, interfaces_stat) {
          var interfaces_grouped_by_agent_id = _.groupBy(interfaces_stat, "agent_id");
          // ой, все. Отсылаем финальный вариант
          
        });
        response.send(full_response);
      });
    });
  }); 
};

// получить стат. информации об агенте/агентах
app.get('/extra/api/agents/:agents', function (req, res) {
  var agents = getIdsFromAndArray(req.params.agents);
  var agents_int = agents;
  var agents_string = agents.join();
  var start_date = req.body.from;
  var end_date = req.body.till;
  var q = new sql.Request(connection);
  // собираем информации об агентах
  q.query(queries.agents.format([agents_string]), function (err, _agents) {
    q.query(queries.table.format(["hdd_partitions"]), function (err, _hdd_partitions) {
      q.query(queries.table.format(["interfaces"]), function (err, _interfaces) {
        q.query("SELECT * FROM memory", function (err, _memory) {
          // Если нет от какого до какого периода нужна статистика
          if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
            q.query(queries.select_latest_n_periods.format([public_config.chart.minutes]), function (err ,_periods) {
              agentsStatFormat(agents_string, _agents, _hdd_partitions, _interfaces, _memory, _periods, q, res);
            });
          }
          else {

          }
        });
      });
    });
    
  });
});

app.listen(process.env.PORT || 80);