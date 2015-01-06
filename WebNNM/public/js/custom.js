$(document).ready(function() {
  $.fn.editable.defaults.mode = 'inline';

  // Прячем flash
  var $flash = $("div#flash");
  $flash.hide();
  // Заменяем идишники на названия в таблицах
  var groups, hosts, types_hp, subscribers, hosts_and_ports, public_config, agents, memory, interfaces, hdd_partitions;
  var lastAgentsStat = [];
  var selected_hosts = [];
  //Подгружаем все нужные данные из c справочников
  $.when(
    $.getJSON('/get/groups', function(data) {
      groups = data
    }),
    $.getJSON('/get/hdd_partitions', function(data){
      hdd_partitions = data;
    }),
    $.getJSON('/get/hosts', function(data) {
      hosts = data
    }),
    $.getJSON('/get/types_of_host_and_port', function(data) {
      types_hp = data
    }),
    $.getJSON('/get/subscribers', function(data) {
      subscribers = data
    }),
    $.getJSON('/get/hosts_and_ports', function(data){
      hosts_and_ports = data;
    }),
    $.get('/dictionaries', function(data) {
      $("#dictionaries").append(data);
    }),
    $.getJSON('/public/public_config.json', function(data) {
      public_config = data;
    }),
    $.getJSON('/agents/all', function(data){
      agents = data;
    }),
    $.getJSON('/get/interfaces', function(data){
      interfaces = data;
    }),
    $.getJSON('/get/memory', function(data){
      memory = data;
    })
    ).then(function(){
      fillSelects();
      // когда кликаем на статистику загружается форма со статистикой
      toStatisticsPage();

      // Добавить группу
      addGroup();
      // Добавить Хост
      addNewHost();
      // Добавить нового подписчика
      addNewSubscriber();
      // Добавить новый тип
      addNewTypeofHostAndPort();
      // добавить новый хост и порт 
      addNewHostAndPort();
      // получить последнюю статистику
      // делаем редактируемыми текстовые поля
      to_individual_statistics_page();
      
      make_editable([
        ".edit-name-of-host", 
        ".edit-ip-or-name", 
        ".edit-name-of-group", 
        ".edit-name-of-host-and-port", 
        ".edit-port-of-host-and-port", 
        ".edit-subscriber-email" 
      ]);
      // и селекты 
      make_editable_select([ 
        ["div.edit-group-id", groups], 
        ["div.edit-host-id", hosts], 
        ["div.edit-type_of_host_and_port_id", types_hp] 
      ]);
      // для удаления
      bind_delete_records([
        [".delete-host", "hosts", ".host_table"],
        [".delete-group", "groups", ".group_table"], 
        [".delete-host-and-port", "hosts_and_ports", ".host_and_port_table"],
        [".delete-subscriber", "subscribers", ".subscribers_table"]
      ]);
  });
  // удалить запись
  function bind_delete_records(array){
    _.each(array, function(e){
      $(e[0]).click(function(event){
        event.preventDefault();
        var id = $(this).attr("id");
        if (confirm("Удалить?")) {
          $.post('/delete/' + e[1], { "id": id }).success(function(){
            $(e[2]).find("tr#" + id).remove();
            showFlash("Удалено успешно! (" + id + ")", "alert alert-success"); 
          });
        };
      });
    });
  };

  // применить к этим классам editable
  function make_editable(array){
    _.each(array, function(e){
      $(e).editable();
    });
  };
  // применить к этим классам editable для создания select - 0 - это имя класса для селекта, 1 - хэш со значенем name
  function make_editable_select(array){
    _.each(array, function(a){
      $(a[0]).editable({
        source: (function(){
          var results = [];
          _.each(a[1], function(e){
            results.push({"id": e.id, "text": e.name });
          });
          return results;
        })(),
        type: 'select'
      });
    });
  };
  // новый метод, который оставляет только уникальные элементы в массиве
  Array.prototype.unique = function() {
    var unique = [];
    for (var i = 0; i < this.length; i++) {
      if (unique.indexOf(this[i]) == -1) {
        unique.push(this[i]);
      }
    }
    return unique;
  };
  // статистика с агентов
  function get_agents_stat(callback){
    lastAgentsStat = [];
    var c = 0;
    _.each(agents, function(i){
      $.getJSON("/agents/stat/latest/%0".format([i.id]), function(data){
        lastAgentsStat.push(data);
      })
      .done(function(){
        c++;
        if (c == agents.length) {
          callback();
        } 
      })
    });
  };
  // Для статистики по пингу
  function get_ping_stats_for_hosts(required_hosts, start_date, end_date, callback){
    var result = [];
    var c = 0;
    if (_.isUndefined(start_date) && _.isUndefined(end_date)) {
      if (_.isArray(required_hosts)) {
        _.each(required_hosts, function(h){
          $.post("/ping/" + h, function(data){
            result.push(data);
          }).done(function(){
            c++;
            if (c == required_hosts.length) {
              callback(result);
            };
          });
        });
      } 
      else {
        $.post("/ping/" + required_hosts, function(data){
          result.push(data);
        }).done(function(){ 
          callback(result); 
        });
      };
    } 
    else {
      // Если указано время начала и конца
    };
  };
  // получить последнюю статистику с агентов
  function getLastAgentsStat(){
    var $agentPartial = ""; 
    var latestPeriods;
    $.when($.getJSON("/periods/latest", function(data){ latestPeriods = data; })).then(function(){
      get_agents_stat(function(){
      // график для пинга
      var required_hosts = [];
      if (selected_hosts.length == 0) {
        required_hosts = _.pluck(hosts, "id");
      }
      else {
        required_hosts = _.pluck(selected_hosts, "id");
        console.log("selected_hosts");
        console.log(selected_hosts);
        console.log("have selected hosts");
        console.log(_.pluck(selected_hosts, "id"));
      };
      console.log("get last agents stat - required hosts")
      console.log(required_hosts);
      get_ping_stats_for_hosts(required_hosts, undefined, undefined, function(data){
        var ping_data = [];
        console.log(data);
        _.each(data[0], function(a){
          _.each(a, function(b){
            ping_data.push({"period": b.period_id });
          });
        });
        _.each(data, function(a){
          _.each(required_hosts, function(b){
            var host_id = b;
            _.each(a[host_id], function(c){
              var s = _.findWhere(ping_data, {"period": parseInt(c.period_id) });
              s[b] = c.latency;
            });
          });
        });
        // теперь нужно сделать массив labels c именами хостов, а также тип дату перевести в часы:минуты
        var labels = [];
        _.each(required_hosts, function(a){
          _.each(hosts, function(b){
            if (a == b.id) {
              labels.push(b.name);
            };
          });
        });
        // теперь нужно получуть исходя из ид периода нормальную дату
        var ykeys = _.keys(ping_data[0]);
        // ключ-период  удалим
        ykeys.pop(); 
        $.getJSON("/period/%0/%1".format([ping_data[0].period, ping_data[ping_data.length - 1].period]), function(result){
          _.each(ping_data, function(a){
            a.period = (_.findWhere(result, {"id": a.period })).period;
          });
        }).done(function(){
            // подгогавливаем конфиг для графика
            chart_config = {
              element: "latest_ping_stats",
              parseTime: false,
              continuousLine: false,
              hideHover: 'always',
              lineColors: public_config.colors,
              pointSize: "0px",
              ymax: 'auto',
              data: ping_data,
              xkey: "period",
              ykeys: ykeys,
              labels: labels
            };
            var chart = Morris.Line(chart_config);
            // рисуем легенду - http://jsfiddle.net/e97YJ/1/
           //$('#legend_ping').append('<ul id="fresh-stats-list"></ul>');
            $('ul#fresh-stats-list').empty();
            chart.options.labels.forEach(function(label, i){
                var legendItem = $('<li></li>').append('<span class="glyphicon glyphicon-tint" style="color:' + chart.options.lineColors[i] + ';margin-right:3px;"></span>' + label);
                $('#legend_ping ul').append(legendItem);
            });
          });
        });
        // Графики для памяти и загрузки цпу
        _.each(agents, function(a){
          _.each(lastAgentsStat, function(la){
            if (_.has(la, a.id)) {
              var $partial = $(public_config["template_for_agent_stat"]);
              $partial.find("#network-usage-charts").attr("id", "network-usage-charts-" + a.id);
              $partial.find("#memory-usage-chart").attr("id", "memory-usage-chart-" + a.id);
              $partial.find("#cpu-usage-chart").attr("id", "cpu-usage-chart-" + a.id);
              $partial.find("#partitions-sizes-charts").attr("id", "partitions-sizes-charts-" + a.id);
              $partial.find("#agent-name").text(getNameFromId(a.id, hosts_and_ports));
              $("#agent-data-container").append($partial);
              // Нарисовать график потребления памяти
              var chart_config = {
                element: "memory-usage-chart-" + a.id,
                parseTime: false,
                continuousLine: false,
                hideHover: 'always',
                pointSize: "0px",
                ymax: _.findWhere(memory, { "host_and_port_agent_id": parseInt(a.id) }).memory_overall,
                data: la[a.id]["cpu_mem"],
                xkey: "date",
                ykeys: ["free_mem"],
                labels: ["Объем оперативной памяти"]
              };
              Morris.Line(chart_config);
              // строим график с загрузкой процессора
              chart_config.element = "cpu-usage-chart-" + a.id;
              chart_config.ymax = "auto";
              chart_config.ykeys = ["cpu_load"];
              chart_config.labels = ["% использования процессора"];
              chart_config.yLabelFormat = function(y){ return y + '%'; };
              chart_config.ymax = 100;
              Morris.Line(chart_config);
              // рисуем графики загрузки интерфейсов
              var interfaces_ids = _.keys(la[a.id]["interfaces_stat"]);
              _.each(interfaces_ids, function(i_id){
                var interface_id_html = "interface-" + i_id;
                $("#network-usage-charts-" + a.id).append("<div class='interface-statistics'><h5>%0</h5><div class='col-md-4' style='width: 300px; height: 200px;' id='%1'></div></div>".format([getNameFromId(i_id, interfaces), interface_id_html]));
                chart_config.element = interface_id_html;
                chart_config.ymax = "auto";
                chart_config.data = la[a.id]["interfaces_stat"][i_id];
                chart_config.ykeys = ["upload", "download"];
                chart_config.labels = ["upload kb/s", "download kb/s"];
                chart_config.yLabelFormat = function(y){ return y + ' kb/s'; };
                Morris.Line(chart_config);
              });
              // рисуем графики для дисков
              var partitions_ids = _.keys(la[a.id]["partitions_stat"]);
              _.each(partitions_ids, function(part_id){
                var interface_id_html = "partition-" + part_id;
                $("#partitions-sizes-charts-" + a.id).append("<div class='partition-stat'><h5>%0</h5><div class='col-md-4' style='width: 300px; height: 200px;' id='%1'></div></div>".format([getNameFromId(part_id, hdd_partitions), interface_id_html]));
                chart_config.element = interface_id_html;
                chart_config.ymax = _.findWhere(hdd_partitions, {"id": parseInt(part_id) }).total_space;
                chart_config.data = la[a.id]["partitions_stat"][part_id];
                chart_config.ykeys = ["size"];
                chart_config.labels = ["Объем"];
                chart_config.yLabelFormat = function(y){ return y + ' Гб'; };
                Morris.Line(chart_config);
              });
            };
          });
        });   
      });
    });
  };
  // когда переходим на страницу со статистикой
  function toStatisticsPage(){
    $("a#stat_link").click(function(event){
      event.preventDefault();
      $("div#statistics").empty();
      
      $.get("/statistics", function(data){ $("div#statistics").append(data); }).done(function(){ getLastAgentsStat(); }).done(function(){
        _.each(groups, function(group){
          $("div#group-checkboxes").append("<span id='checkbox-group'><input type='checkbox'>" + group.name + "</span>");
        });
        ok_stats();
      }); 
    });
  };
  // когда нажимаем на ОК, на странице статистики, чтобы нарисовать на графике только хосты из тех групп, что выделены
  function ok_stats(){
    $("a#accept-groups-for-ping-chart").click(function(e){
      e.preventDefault();
      var checked = [];
      var checked_group_ids = [];
      selected_hosts = [];
      if ($("input:checked").length != 0) {
        $("input:checked").parent().each(function(c,d){checked.push(($($(d)).text()))})
      };
      _.each(checked, function(c){
        checked_group_ids.push(_.findWhere(groups, { name: c }).id);
      });
      _.each(checked_group_ids, function(i){
        selected_hosts.push(_.where(hosts, { group_id: i })); 
      });
      console.log("ok_stats selected hosts ");
      console.log(selected_hosts);
      selected_hosts = _.flatten(_.without(selected_hosts, undefined));
      $("div#latest_ping_stats").empty();
      $("div#agent-data-container").empty();
      getLastAgentsStat();
    }); 
  };
  // при переходе на страницу статистика для хоста
  function to_individual_statistics_page(){
    $.datepicker.setDefaults($.datepicker.regional["ru"]);
    $("a#individual-stat").click(function(e){
      e.preventDefault();
      $("div#only-for-this-host-statistics").empty();
      $.get("/individual", function(html){
        $("div#only-for-this-host-statistics").append(html);
        // набиваем селекты данными и времени
        $("select#time_to").append(appendOptionsToSelects(public_config.time_for_select));
        $("select#time_from").append(appendOptionsToSelects(public_config.time_for_select));
        // календарик
        $("input#start_period").datepicker();
        $("input#end_period").datepicker();
        // выбор для какого хоста строить график пинга
        $("select#this-host").append(appendOptionsToSelects(hosts));
        go_host_statistics();
      });
    });
  };
  // Когда нажимаем на кнопочку Го, на табе статистика для хоста
  function go_host_statistics(){
    $("a#this-host-btn").on('click', function(e){
      e.preventDefault();
    });
  };
  // Получить исходя из ид имя
  function getNameFromId(id, array){
    var result, field;
    ['name', 'period', 'email', 'partition_letter'].forEach(function(f){
      if (array[0][f] != undefined) {
        field = f
      };
    });
    array.forEach(function(e){
      if (e.id == id) { result = e[field] };
    });
    return result;
  };
  // создать элементы селект на форме
  function fillSelects() {
    // На форме хостов и портов
    $('select#host_and_port_id').append(appendOptionsToSelects(hosts));
    $('select#host_and_port_type').append(appendOptionsToSelects(types_hp));
    // на форме хостов
    $('select#host_group').append(appendOptionsToSelects(groups));
  };

  function appendOptionsToSelects(table) {
    var stringOptions = '';
    if (_.isString(table[0])) {
      _.each(table, function(e){
        stringOptions += "<option value='%0'>%0</option>".format([e]);
      });
    }
    else {
      _.each(table, function(e){
        stringOptions += "<option value='%0'>%1</option>".format([e.id, e.name]);
      });
    };
    return stringOptions;
  };
  // добавить группу
  function addGroup() {
    $("#add_group").submit(function(event) {
      event.preventDefault();
      var data = $(this).serializeArray();
      $.ajax({
        url: '/new/group',
        type: 'POST',
        data: data,
      }).done(function() {
          $('#flash').addClass('bg-success').html("Добавлено" + data[0].value);
          $('.group_table').find('tbody').append("<tr><td>" + data[0].value + "</td><td></td><tr>");
          console.log("success");
        });
    });
  };
  // Добавить новый хост
  function addNewHost() {
    $('#add_host').submit(function(event) {
      event.preventDefault();
      var data = $(this).serializeArray();
      var name = data[0].value;
      var address = data[1].value;
      if (name == '' || name == undefined) {
        data[0].value = address;
      }
      if ( isValidDomainName(address) || isValidIp(address) ) {
        $.post('/new/host', data, function() {
          var group_option_select;
          groups.forEach(function(e) {
            if (data[2].value == e.id) {
              group_option_select = e.name;
            };
          });
          $('.host_table').find('tbody').append("<tr><td>" + data[0].value + "</td><td>" + address + "</td><td>" + group_option_select + "</td><td></td><tr>");
          showFlash(name + "успешно добавлен!", "alert alert-success");
        });
      }
      else {
        showFlash("Неверный адрес!", "alert alert-warning");
      }
    });
  };
  // добавить новый хост и порт
  function addNewHostAndPort(){
    $("form#add_host_and_port").submit(function(e){
      e.preventDefault();
      var raw = $(this).serializeArray();
      var name = raw[0].value;
      var port = raw[2].value;
      if ((name != '' && name != undefined) && (port != '' && port != undefined)) {
        $.post('/new/host_and_port', raw, function(){
        });
      };
    });
  }
  // Добавить новый тип хоста и порта
  function addNewTypeofHostAndPort() {
    $("form#add_type").submit(function(event) {
      event.preventDefault();
      var raw_type = $(this).serializeArray();
      console.log(raw_type);
      var type = raw_type[0].value;
      if (type != '' && type != undefined) {
        $.post('/new/type_of_host_and_port', raw_type, function() {
          $('.type_table tbody').append("<tr><td>" + type + "<td></td><td></td></td><tr>");
          showFlash(type + " успешно добавлен", "alert alert-success");
        });
      }
      else {
         showFlash("Пусто", "alert alert-warning");
      }
    })
  };
  // Добавить нового подписчика
  function addNewSubscriber() {
    $("form#add_subscriber").submit(function(event) {
      event.preventDefault();
      var raw_email = $(this).serializeArray();
      var email = raw_email[0].value;
      if (isValidEmailAddress(email)) {
        $.post('/new/subscriber', raw_email, function() {
          $('.subscriber_table').find('tbody').append("<tr><td>" + email + "</td><td></td><td></td><tr>");
        }).done(function () {
          showFlash(email + " успешно добавлен!", "alert alert-success");
        });
      }
      else {
        showFlash(email + " - неправильный формат email", "alert alert-warning");
      };
    });
  };
  // Проверка email адреса http://stackoverflow.com/questions/2855865/jquery-regex-validation-of-e-mail-address
  function isValidEmailAddress(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
  };
  // Показать flash
  function showFlash(text, alertClass) {
    $flash.append(text).addClass(alertClass).show().delay(4000).fadeOut('fast', function(){
      $(this).removeClass().html('');
    });
  };
  // Проверка корректности ip адреса - спасибо stackoverflow
  function isValidIp(IpAddress) {
    var pattern = new RegExp(/(([1-9]?\d|1\d\d|2[0-5][0-5]|2[0-4]\d)\.){3}([1-9]?\d|1\d\d|2[0-5][0-5]|2[0-4]\d)/);
    return pattern.test(IpAddress);
  };
  // Проверка корректности доменного имени - спасибо stackoverflow
  function isValidDomainName(site) {
    var pattern = new RegExp(/^(?!:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i);
    //return pattern.test(site);
    return true; // разобраться почему k-vrachu.mz19.ru не работает
  };
  // Получить случайный цвет  -> http://www.paulirish.com/2009/random-hex-color-code-snippets/
  function getRandomColor() {
    return ('#'+Math.floor(Math.random()*16777215).toString(16));
  }
});