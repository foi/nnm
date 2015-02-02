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
  table: "SELECT * FROM %0 ORDER BY id ASC",
  select_latest_n_periods: "DECLARE @max_id int = (SELECT MAX(id) FROM periods) DECLARE @min_id int = @max_id - %0 SELECT id, period FROM periods WHERE id BETWEEN @min_id AND @max_id",
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
  exec('sc query "ServiceNNM"', function (error, stdout, stderr) {
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
        q.query(queries.get_ping_stats_from_till_period_for_hosts.format([_.first(periods_ids), _.last(periods_ids), hosts_string]), function (err, _ping_data) {
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
// вспомогательные функции для маршрута, который дает статистику для агентов
function agents_helper_periods_and_append_into_cpumem (periods, periods_readable, periods_ids, agents_ids, cpmem, missed_periods) {
  // создадим строки даты/времени 
  _.each(periods, function (p) {
    periods_readable.push(strftime("%Y-%m-%dT%H:%M:%S", p.period));
  });
  _.each(agents_ids, function (e) {
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
};
// создадим справочники, ид интерфейсов агентов ну и т.п.
function agents_helper_make_dictionaries (interfaces, interface_id_and_name, hdds, hdd_partitions_with_names, limits_on_partitions_in_agents, agents_and_partitions_ids, agents_and_interfaces_ids) {
  var tmp_partitions = _.groupBy(hdds, "host_and_port_agent_id");
  var hdd_partitions = _.groupBy(hdds, "id");
  // коллекция  { ид_интерфейса : имя интерфейса }
  _.each(interfaces, function (v) {
    interface_id_and_name[v.id] = v.name;
  });
  console.log(interface_id_and_name);
  // коллекция ид раздела : { объем, имя }
  _.each(hdd_partitions, function (v, k) {
    hdd_partitions_with_names[k] = {size: v[0]['total_space'], name: v[0]['partition_letter']};
  });
  // Для подписей к пределам разделов
  _.each(tmp_partitions, function (v, k) {
    limits_on_partitions_in_agents[k] = [];
    _.each(v, function (partition_data) {
      limits_on_partitions_in_agents[k].push({value: partition_data["total_space"], text: "предел раздела " + partition_data["partition_letter"] });
    });
  });
  // список ид разделов, для агентов
  _.each(tmp_partitions, function (v, k) {
    agents_and_partitions_ids[k] = [];
    _.each(v, function (partition_data) {
      agents_and_partitions_ids[k].push(partition_data["id"]);
    });
  });
  // создадим коллекцию в ид агентов и их ид интерфейсов
  var tmp_interfaces = _.groupBy(interfaces, "host_and_port_agent_id");
  _.each(tmp_interfaces, function (v, k) {
    agents_and_interfaces_ids[k] = [];
    _.each(v, function (interface_data) {
      agents_and_interfaces_ids[k].push(interface_data["id"]);
    }); 
  });
};
// хелпер нанолняющий данные уже в тот формат, что требует c3js
function agents_helper_fill_for_c3js (cpmem, full_response, memory, periods_readable) {
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
  });
};
// хелпер для наполнения информации о разделах жестких дисков
function agents_helper_fill_partitions_data(missed_periods, hdd_partitions_with_names, agents_and_partitions_ids, limits_on_partitions_in_agents, periods_readable, full_response, hdd_part_stat) {
  var g_partitions = _.groupBy(hdd_part_stat, 'agent_id');
  // заменим размер, если он 0 на null, а также заменим ид партишна на его букву
  // еще более сгруппированные данные разделов
  var g_f_partitions = {};
  // добавим недостающие периоды и причешем данные в тот формат, что требует c3js
  _.each(missed_periods, function (v, k) {
    if (!_.isEmpty(missed_periods[k])) {
      _.each(missed_periods[k], function (p) {
        _.each(agents_and_partitions_ids[k], function (p_id) {
          g_partitions[k].push({"agent_id": k, "size": null, "hdd_partition_id": p_id, "period_id": p});
        });
      });
      g_partitions[k] = _.sortBy(g_partitions[k], "period_id"); // упорядочиваем по period_id
    };
    // заменим hdd_partitions_id на "c:\ (465гб)"
    _.each(g_partitions[k], function (vh) {
      var name = "%0 (%1ГБ)".format([hdd_partitions_with_names[vh["hdd_partition_id"]]["name"], hdd_partitions_with_names[vh["hdd_partition_id"]]["size"]]);
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
    full_response[k]["partitions"].push(periods_readable);
    // теперь преобразуем "partitions_info" в тот вид, который требует c3js для грида
    var partitions_info = [];
    _.each(full_response[k]["partitions_info"], function (vh, vk) {
      partitions_info.push({value: vh['size'], text: ("предел на " + vh['name'])});
    });
    full_response[k]["partitions_info"] = limits_on_partitions_in_agents[k];
  });
};
// создание данных для интерфейсов
function agent_helper_interfaces_sorting (interfaces_stat, agents_and_interfaces_ids, interface_id_and_name, full_response, periods_ids, periods_readable) {
  // как всегда, сначала группируем по agent_id
  // новая колелкция где все данные для интерфейсов уже должны быть причесаны
  var interfaces_grouped_by_agent_id = _.groupBy(interfaces_stat, "agent_id");
  // ////// !!!!!!! В базе попраить! Если удаляешь хост и порт, а у него есть интерфейсы, он не удаляетсяЙЙЙЙ !!!  с cpu_mem_load_поставить_каскад и в интерфейсах
  // теперь набьем недостающее периоды
  console.log("ид периодов, которые есть в данном запросе " + periods_ids);
  _.each(_.keys(interfaces_grouped_by_agent_id), function (agent_id) {
    _.each(periods_ids, function (p) {
      _.each(agents_and_interfaces_ids[agent_id], function (i) {
        if (_.isUndefined(_.findWhere(interfaces_grouped_by_agent_id[agent_id], {interface_id: i, period_id: p}))) {
          interfaces_grouped_by_agent_id[agent_id].push({"period_id": p, interface_id: i, "upload": null, "download": null});
          //console.log({"period_id": p, interface_id: i});
        };
      });
    });
    interfaces_grouped_by_agent_id[agent_id] = _.sortBy(interfaces_grouped_by_agent_id[agent_id], "period_id"); 
    console.log(_.size(interfaces_grouped_by_agent_id[agent_id]));
    // сначала добавим имя интерфейса
    _.each(interfaces_grouped_by_agent_id[agent_id], function (i) {
      i["interface_name"] = interface_id_and_name[i["interface_id"]];
    });
    // теперь еще и группируем по имени интерфейса
    interfaces_grouped_by_agent_id[agent_id] = _.groupBy(interfaces_grouped_by_agent_id[agent_id], "interface_name");
    // теперь необходимо сгруппировать следующим образом {agent_id: [["подключение по локальной сети1 UL", 1,3,4 ], ["подключение по лок сети DL", 2,3,4,5,1]]}
    var agent_i, tmp_interfaces_data;
    var i_index = 0;
    _.each(interfaces_grouped_by_agent_id[agent_id], function (_interface_data) {
      console.log(_interface_data);
      if (_.isUndefined(agent_i)) {
        agent_i = agent_id;
        tmp_interfaces_data = [];
      } else {
        if (agent_i != agent_id) {
          agent_i = agent_id;
          tmp_interfaces_data = [];
        };
      };
      // сначала заполним UL для интерфейсов
      _.each(_interface_data, function (i, idx) {
        if (_.isUndefined(tmp_interfaces_data[i_index])) {
          tmp_interfaces_data.push(["UL " + i["interface_name"]]);
          tmp_interfaces_data[i_index].push(i["upload"]);
        } 
        else {
          tmp_interfaces_data[i_index].push(i["upload"]);
          if (idx == _.size(periods_ids - 1)) i_index += 1;
        };
      });
      // а теперь и DL
      _.each(_interface_data, function (i, idx) {
        if (_.isUndefined(tmp_interfaces_data[i_index])) {
          tmp_interfaces_data.push(["DL " + i["interface_name"]]);
          tmp_interfaces_data[i_index].push(i["download"]);
        } 
        else {
          tmp_interfaces_data[i_index].push(i["download"]);
          if (idx == _.size(periods_ids - 1)) i_index += 1;
        };
      });
      full_response[agent_id]["interfaces_data"] = tmp_interfaces_data;
    });
  // добавим периоды
  full_response[agent_id]["interfaces_data"].push(periods_readable);
  }); 
};
// формирование информации об агентах
function agentsStatFormat(agents_string, agents, hdds, interfaces, memory, periods, q, response) {
  var hdd_partitions_with_names = {};
  var agents_ids = _.pluck(agents, "id");
  var interface_id_and_name = {};
  var agents_and_partitions_ids = {};
  var limits_on_partitions_in_agents = {};
  var agents_and_interfaces_ids = {};
  var missed_periods = {}; // потерянные периоды
  var periods_readable = ["periods"];
  // наполним справочники
  agents_helper_make_dictionaries(interfaces, interface_id_and_name, hdds, hdd_partitions_with_names, limits_on_partitions_in_agents, agents_and_partitions_ids, agents_and_interfaces_ids);
  console.log(agents_and_interfaces_ids);
  var full_response = {};
  var periods = periods;
  var periods_ids = _.pluck(periods, "id");
  var partitions_size_name = {};
  // ответ будет следующего формата вставить сслыку на гист гитхаба
  // сначала соберем информацию о процессоре и оперативке и о потеряных периодах
  q.query(queries.select_cpu_mem_load_for_agents.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, cpmem) {
    // поиск потерянных периодов для агентов, а также сырое заполнение данных для статистики цпу и памяти
    agents_helper_periods_and_append_into_cpumem(periods, periods_readable, periods_ids, agents_ids, cpmem, missed_periods);
    // набьем данные в финальный ответ для статистики цпу и памяти, а также добавим сколько всего оперативки, и макс на разделе места 
    agents_helper_fill_for_c3js(cpmem, full_response, memory, periods_readable, full_response);
    // теперь соберем информацию о разделах
    q.query(queries.select_hdd_part_stat.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, hdd_part_stat) {
      // выполним все необходимые процедуры для форматирования ответа как этого требет c3js
      agents_helper_fill_partitions_data(missed_periods, hdd_partitions_with_names, agents_and_partitions_ids, limits_on_partitions_in_agents, periods_readable, full_response, hdd_part_stat);
      // теперь будем считывать информацию об интерфейсах 
      q.query(queries.select_interfaces_stat.format([_.first(periods_ids), _.last(periods_ids), agents_string]), function (err, interfaces_stat) {
        agent_helper_interfaces_sorting(interfaces_stat, agents_and_interfaces_ids, interface_id_and_name, full_response, periods_ids, periods_readable);
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
  // собираем информацию об агентах
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