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
var sys = require('sys')
var exec = require('child_process').exec;
// для layout.ejs без этого не работает
var expressLayouts = require('express-ejs-layouts');
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
  select_periods_from_between_ids: "SELECT * FROM periods WHERE id BETWEEN %0 AND %1"

}

var html_folder = __dirname + '/public/html/';
// подлючение к базе данных
var connection = new sql.Connection(config);
connection.connect(function(err){
  err ? console.log(err) : console.log("db connection established");
});

// хелперы

// Ни одно из значений не пусто
function allFilled(array) {
  var should_be_correct_count = array.length;
  var correct_count = 0;
  array.forEach(function(element) {
    if (element != '') {
      correct_count += 1;
    }
  });
  if (correct_count == should_be_correct_count) {
    return true;
  } else {
    return false;
  }
};

// Получить исходя из ид имя

function setPeriodForPeriodId(array, format, periods_array){
  _.map(array, function(e){
    e.date = strftime(format, new Date((_.findWhere(periods_array, { "id": e.period_id} )).period));
  });
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
  connection.connect(function(err){
    res.send(err.code);
  });
});
// Проверка, работает ли служба ServiceNNM
function puts(error, stdout, stderr) { sys.puts(stdout) };

app.get('/config/servicennm', function (req, res) {
  exec('sc query "ALG1"', function (error, stdout, stderr) {
    var w = stdout.indexOf("RUNNING");
    if (w == -1) {
      stdout.indexOf("STOPPED") == -1 ? res.send("STOPPED") : res.send("NOTEXIST");
    } else {
      res.send("RUNNING");
    }
  });
  
});

// получить последнюю информацию о пинге для всех хостов
// app.get('/latest/ping/all', function(req, res){
//   var q = new sql.Request(connection);
//   q.query(queries.get_latest_ping_data.format([public_config.chart.minutes]), function(err, entries){
//     res.send(entries);
//   });
// });
// Получить статистику по одному хосту
app.get('/stat/single/:type/:id', function (req, res) {
  var id = req.params.id;
  var type = req.params.type;
  var result_stat_ping = { "id_periods_when_it_is_down": [], "count": 0, "avg_latency": 0, "times_of_down": 0 };
  var result_stat_ports = { "id_periods_when_it_is_down": [], "count": 0, "times_of_down": 0 }
  var ping_data = 0;
  // если статистика по пингу
  if (type == 'ping') {
    var q = new sql.Request(connection);
    q.query(queries.select_ping_stat_for_host.format([id]), function (err, entries) {
      entries.forEach(function(e){
        if (e.latency == 0) {
          result_stat_ping['id_periods_when_it_is_down'].push(e.period_id);
        };
        ping_data += e.latency;
      });
      result_stat_ping['count'] = entries.length;
      result_stat_ping['times_of_down'] = result_stat_ping['id_periods_when_it_is_down'].length;
      result_stat_ping['avg_latency'] = parseInt(ping_data / result_stat_ping['count']);
      res.send(result_stat_ping);
    });
  }
  // Если статистика по портам
  else if (type == 'check_port') {
    var q = new sql.Request(connection);
    q.query(queries.select_check_port_stat_for_host_and_port.format([id]), function (err, entries) {
      console.log(err);
      entries.forEach(function(e){
        if (e.is_alive == false) {
          result_stat_ports["id_periods_when_it_is_down"].push(e.period_id);
        };
      });
      result_stat_ports['count'] = entries.length;
      result_stat_ports['times_of_down'] = result_stat_ports['id_periods_when_it_is_down'].length;
      console.log(result_stat_ports);
      res.send(result_stat_ports);
    });
  }
});

// получить данные из таблицы в json
app.get('/get/:table', function(req, res) {
  //var tables = ["interfaces", "periods" ];
  var table_name = req.params.table;
  var q = new sql.Request(connection);
  if (table_name.indexOf(' ') == -1) {
    if (_.include(public_config.tables, table_name)) {
      q.query(queries.table.format([table_name]), function(err, entries) {
        res.send(entries);
      });
    } else {
      q.query("SELECT * FROM memory", function(err, entries){
        res.send(entries);
      });
    }
  } else {
    res.sendStatus(404);
  }
});
// Получить данные из таблицы не все, а определенное количество
app.get('/get_last_/:quantity/_records_from_/:table', function (req, res) {
  var quantity = req.params.quantity;
  var table_name = req.params.table;
  q = new sql.Request(connection);
  q.query(queries.select_last_n_entries.format([table_name, quantity]), function (err, entries) {
    res.send(entries);
  });
});
// получить статистику за сегодня
app.get('/latest/:table_name', function(req, res){
  // получаем сегодняшний день
  var today = moment.utc().format('YYYYMMDD');
  var tomorrow = moment().utc().add(1, 'day').format('YYYYMMDD');
  // если нужен пинг
  if (req.params.table_name == "ping") {
   // выберем первый  и последний id периода на сегодня
    var qGetFirstPeriodOfThisDay = new sql.Request(connection);
    qGetFirstPeriodOfThisDay.query(queries.get_all_today_periods.format([today, tomorrow]), function(err, entries){
      var minPeriod = entries[0]['id']; 
      var maxPeriod = entries[entries.length - 1]['id'];
     });
  };
});

// Запрос графика пинга для  1  хоста
app.get('/chart/ping/:host_id/', function(req, res) {
  q = new sql.Request(connection);
  q.query(queries.get_latest_n_journal_of_ping_entries_about_host.format([public_config.chart.minutes, req.params.host_id]), function(err, entries) {
    res.send(entries);
  });
});

// дать идишники агентов + группу ид и ид хоста
app.get('/agents/all', function(req, res){
  q = new sql.Request(connection);
  q.query(queries.select_hp_ids_agents, function(err, entries){
    res.send(entries);
  });
});
// get latest periods
app.get("/periods/latest", function(req, res){
  var q = new sql.Request(connection);
  q.query(queries.id_period_maximum, function(err, data){
    var p_ids = _.range(data[0][''] - (public_config.chart.minutes), data[0][''] + 1, 1);
    var clean_ids = p_ids.toString();
    q.query(queries.select_this_periods.format([clean_ids]), function(err, data){
      res.send(data);
    });
  });
});

// передать периоды с ид и самим периодом
app.get("/period/:from/:to", function(req, res){
  var q = new sql.Request(connection);
  q.query(queries.select_periods_from_between_ids.format([req.params.from, req.params.to]), function(err, result){
    _.each(result, function(a){
      a.period = strftime("%H:%M", new Date(a.period));
    });
    res.send(result);
  });
});

app.post("/ping/:host_id", function(req, res){
  var q = new sql.Request(connection);
  var host_id = req.params.host_id;
  var start_date = req.body.from;
  var end_date = req.body.upto;
  var resp = {};
  // Если не будет данных о периоде, за какой нужна информация
  if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
    q.query(queries.select_latest_n_periods.format([(public_config.chart.minutes - 1)]), function(err, p_data){
      var latest_periods_ids = _.pluck(p_data, "id");
      q.query(queries.select_latest_ping_stat_till_period_from_period_for_host.format([_.first(latest_periods_ids), _.last(latest_periods_ids), host_id]), function(err, ping_data){
        var missed_periods = _.difference(latest_periods_ids, _.pluck(ping_data, "period_id"));
        _.each(missed_periods, function(p){
          ping_data.push({ "host_id": host_id, "latency": null, "period_id": p });
        });
        // заменить 0 на null, чтобы были разрывы в графике
        _.each(ping_data, function(p){
          if (p.latency == 0) { p.latency = null };
        });
        console.log(ping_data);
        var sorted = _.sortBy(ping_data, "period_id");
        resp[host_id] = sorted;
        res.send(resp);
      });
    });
  }
  else {
    // Если все-таки будет
    console.log(start_date);
  };
});
// получить хтмл для индивидуальной статистики
app.get("/individual", function(req, res){
  res.render("individual/index.ejs", { layout: false });
});
// получить html для последней статистики
app.get("/statistics", function(req, res){
  res.render("statistics/index.ejs", { layout: false });
});
// получаем последнюю статистику за последние 30 минут для определенного агента 
app.get("/agents/stat/latest/:id", function(req, res){
  var agent_id = req.params.id;
  var response = {};
  response[agent_id] = {};
  var q = new sql.Request(connection);
  q.query(queries.table.format(["hdd_partitions"]), function(err, hdd_partitions){
    q.query(queries.select_latest_n_periods.format([(public_config.chart.minutes - 1)]), function(err, p_data){
      var latest_periods = _.pluck(p_data, "id");
      var periods_range_and_agent_id = [_.first(latest_periods), _.last(latest_periods), agent_id];
      q.query(queries.select_cpu_mem_load_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, cpu_mem_data){
        //теперь нужно найти каких периодов нет в cpu_mem_data и вставить значения
        var missed_periods = _.difference(latest_periods, _.pluck(cpu_mem_data, "period_id"));
        if (!_.isEmpty(missed_periods)) {
          _.each(missed_periods, function(p){
            cpu_mem_data.push({ "cpu_load": null, "free_mem": null, "period_id": p });
          });
        };
        // заменим period_id на нормальную дату 
        setPeriodForPeriodId(cpu_mem_data, "%H:%M", p_data);
        response[agent_id]["cpu_mem"] = cpu_mem_data;
        q.query(queries.select_interfaces_stat_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, interface_stat_data) {
          // снова найдем в interface_stat_data каких периодов нет, и вставим их
          var missed_periods_for_interface = _.difference(latest_periods, _.pluck(interface_stat_data, "period_id"));
          var grouped_interfaces = _.groupBy(interface_stat_data, function(i){ return i.interface_id });
          if (!_.isEmpty(missed_periods_for_interface)) {
            _.each(grouped_interfaces, function(i){
              _.each(missed_periods_for_interface, function(p){
                i.push({"upload": null, "download": null, "period_id": p });
              });
            });
          };
          // заменим period_id на нормальную дату 
          _.each(grouped_interfaces, function(i){
            setPeriodForPeriodId(i, "%H:%M", p_data);
          });
          response[agent_id]["interfaces_stat"] = grouped_interfaces;
          // выбирай статистику для разделов
          q.query(queries.select_hdd_partitions_stat_till_period_from_period_for_agent.format(periods_range_and_agent_id), function(err, partitions_stat_data){
           // !сделать единый метод для вставки недостающих, добавить сортировку по периоду.
            var missed_periods_for_disks = _.difference(latest_periods, _.pluck(partitions_stat_data, "period_id"));
            var grouped_partitions = _.groupBy(partitions_stat_data, function(p){ return p.hdd_partition_id });
            if (!_.isEmpty(missed_periods_for_disks)) {
              _.each(grouped_partitions, function(p){
                _.each(missed_periods_for_disks, function(missed_p){
                  p.push({ "size": null, "period_id": missed_p });
                });
              });
            };
            _.each(grouped_partitions, function(p){
              setPeriodForPeriodId(p, "%H:%M", p_data);
            });
            response[agent_id]["partitions_stat"] = grouped_partitions;
            res.send(response);
          });
        });
      });
    }); 
  });
});
// Единый маршрут для добавления в разные таблицы
app.post('/new/:record_in_table', function(req, res) {
  var table = req.params.record_in_table;
  // Если добавляется группа
  if (table == 'group') {
    if (req.body.group_name != '') {
      var transaction = connection.transaction();
      transaction.begin(function() {
        var insertGroupInTable = transaction.request();
        insertGroupInTable.query(queries.add_new_group.format([req.body.group_name]), function() {
          transaction.commit();
        });
      });
      res.sendStatus(200);
    }
  }
  // Если хост
  else if (table == 'host') {
    var r = req.body;
    if (allFilled([r.host_name, r.host_ip, r.host_group])) {
      var transaction = connection.transaction();
      transaction.begin(function(error) {
        var insertHost = transaction.request();
        insertHost.query(queries.add_host.format([r.host_name, r.host_ip, r.host_group]), function() {
          transaction.commit();
        });
      });
      res.sendStatus(200);
    }
  }
  // Если хост с портом
  else if (table == 'host_and_port') {
    r = req.body;
    if (allFilled([r.host_and_port_name, r.host_and_port_id, r.host_and_port_port, r.host_and_port_type])) {
      var transaction = connection.transaction();
      transaction.begin(function() {
        var insertHostAndPort = transaction.request();
        insertHostAndPort.query(
          queries.add_new_host_with_port.format([r.host_and_port_id, r.host_and_port_port, r.host_and_port_name, r.host_and_port_type, r.host_and_port_route]),
          function(err) {
            transaction.commit();
          })
      })
      res.sendStatus(200);
    }
  }
  // Если тип хоста с портом
  else if (table == 'type_of_host_and_port') {
    var type = req.body.type_name;
    var transaction = connection.transaction();
    transaction.begin(function() {
      var insertType = transaction.request();
      insertType.query(queries.add_new_type_of_host_and_port.format([type]), function(err) {
        console.log(err);
        transaction.commit();
      });
    })
    res.sendStatus(200);
  }
  // Если подписчик
  else if (table == 'subscriber') {
    var email = req.body.subscriber_email;
    var transaction = connection.transaction();
    transaction.begin(function(){
      var insertSubscriber = transaction.request();
      insertSubscriber.query(queries.add_subscriber.format([email]), function(){
        transaction.commit();
      });
    });
    res.sendStatus(200);
  };
  //
});
// Единый маршрут для редактирования 
app.post('/edit/:table_name', function(req, res){
  var table = req.params.table_name;
  var field = req.body.name;
  var q = new sql.Request(connection);
  var value = req.body.value;
  var id = req.body.pk;
  if (_.contains(["name", "ip_or_name"], field)) {
    q.query(queries.update_table_field_string_value_with_id.format([table, field, value, id]), function(err){
      res.sendStatus(200);
    });
  }
  else {
    q.query(queries.update_table_field_int_value_with_id.format([table, field, value, id]), function(err){
      res.sendStatus(200);
    });
  };
});

// для удаления
app.post('/delete/:table_name', function(req, res) {
  var q = new sql.Request(connection);
  q.query(queries.delete_from_table_with_this_id.format([req.params.table_name, req.body.id]), function(err){ res.sendStatus(200); })
});

app.listen(process.env.PORT || 80);