noname Network Monitor
=====================

### Релизы

* [v0.1 - скачать](https://dl.dropboxusercontent.com/u/5433393/github/nonamenetworkmonitor/releases/NonameNetworkMonitor.v0.1.zip)

===========
# Интро

Для платформы  Шindoшs крайне мало приложений для мониторинга сети, а если и есть, то они как правило платные. Вот и вся мотивация. А, да, в первую очередь система разрабатывается для моей работы.

_Это мое первое в жизни приложение, написанное с использованием c# и nodejs_

## Что необходимо?

* любой windows - x86, x64
* .net framework 4.5 (для службы) и 3.5 как минимум для агента
* nodejs, которая должна находится в PATH (хотя тут как желаете)
* MS SQL SERVER 2014, 2012 (любая редакция), на версиях ниже не проверял, но скорее всего все будет ок.
* IIS с установленными модулями URL REWRITE, ARR, IISNODE (можете и без IIS, если устраивает localhost:3000)

## Создание базы данных

Отредактировать скрипт init_database.bat:
```
sqlcmd -S FOI-PC\SQLEXPRESS -Usa -PQwerty123 -i create_database_and_tables.sql
```
Запустить .bat скрипт.

Если неустраивает название базы данных, которая создается данным скриптом, правьте название в create_database_and_tables.sql.

## Конфигурация модулей

Для ServiceNNM и WebNNM необходимо отредактировать строку подключения файле config.json.

## Смысл

Мониторинг доступности пингом, получение информации от агентов о загрузке ЦП, памяти, и т.д., проверка размера веб-страниц.

Система состоит из трех модулей: 
* агент для windows (c#) AgentNNM, агент для *nix (sysvinit, systemd системы) (ruby)
* служба windows (c#) ServiceNNM
* веб-интерфейс (nodejs, javascript) WebNNM

Возможности:
 - считывание информации с хостов с периодичностью в 1 минуту;
 - уведомление по email об недоступности хоста, порта (...) в течение X минут (настраивается в config.json "number_of_periods_after_to_send_notify");
 - Проверка размера веб-страниц и отсылка уведомления об его изменении на email
 - статистика задержек пинга
 - веб-интерфейс для конфигурирования и просмотра статистики

## Пофиксить
 - Ошибки в проверке размера веб-страниц

## Как использовать

Есть две версии AgentNNM:

* AgentNNM for .net 3.5 для древнего и остойнейшего .net framework 3.5 (обладает ограниченным функционалом и немного большим откликом, в случае большого количества сетевых интерфейсов)
* AgentNNM для .net framework 4 + с блекджеком и шлюхами (есть возможность мониторить список хостов и размеры страницы удаленных хостов и отсылка уведомлений)

Обе версии отображают одну и ту же информацию: об общей загрузке CPU, объеме ипользуемой оперативной памяти и ее общем объеме (в мегабайтах), объеме занятого пространства на разделе жесткого диска и его общем объеме, о скорости upload/download на интерфейсах в килобитах в секунду, а также информацию о запущенных и остановленных сервисах.

![Пример работы Агента](http://i.imgur.com/vs2wGN7.png)

Версия для .net 3.5

![Агент для .net 3.5](http://i.imgur.com/91YYPTR.jpg)

Версия для .net 4.0 +

![Агент для .net 4.0 +](http://i.imgur.com/bPfSOJh.jpg)

Агент используется вместе с noname network monitor service :family:

#### Использование

* Указываете порт, по которому агент будет отдавать данные в формате json
* Указываете ip-адрес интерфейса, на котором будет работать агент (можно указать *, и тогда информация будет доступна при обращении на любой интерфейс по порту, который вы выбрали)
* Информация о upload/download не будет выводиться для тех интерфейсов, что указаны в «Игнорируемые имена интерфейсов»
* В «Списке сервисов» вы выбераете сервисы, состояние которых вы желаете отслеживать

Плюс для версии Агента 4.0 + можно настраивать отслеживание размера страниц (список через запятую) и хостов, рассылку уведомлений для подписчиков на email.

После внесения изменений необходимо «Сохранить изменения»

Далее необходимо запустить сервер.

Пока что Агенты не оформлены как служба, поскольку нужно больше времени на тестирование их стабильности.

Конфигурация агента хранится в файле _config.json_. Перед первым запуском нужно переименовать config.json.example в config.json

## Установка как службы WebNNM т.е. веб-интерфейса

Установка в качестве службы выполняется при помощи утилиты [non sucking service manager (описание примера настройки на английском)](https://nssm.cc/usage), [Описание примера настройки на русском](http://nix-sa.blogspot.ru/2013/05/windows-nssm.html).  

В качестве альтернативы можно использовать [iisnode](https://github.com/tjanczuk/iisnode) модуль. 

Как выглядит веб-интерфейс WebNNM:

Конечно потом будет красивее и более лучше, с ангуляром, а сейчас с jquery.

![Справочники](http://i.imgur.com/nLV2HFq.jpg)

![Статистика](http://i.imgur.com/hZWXABA.jpg)

*Для того, чтобы WebNNM могла останавливать/запускать службу, ее необходимо запускать от имени администратора*

## Файлы конфигурации
### ServiceNNM

Пример config.json:
```
{
  "connection_string": "Data Source=LOCALHOST\\SQLEXPRESS;Initial Catalog=noname_network_monitor;User ID=sa;Password=Qwerty123;Connection Lifetime=0",
  "Smtp" : {
    "server": "mail.gmailco.com",
    "port": 25,
    "ssl": false,
    "from": "agent@gmailco.com",
    "password": "y33Qwe12",
    "notification": true,
    "sleep_after_send_one_mail_message": 100
  },
  "Timeouts" : {
    "for_web_page_check": 3000,
    "for_smtp_mail_send": 1000,
    "for_ping": 2000,
    "for_check_port": 1000,
    "for_get_from_agent": 5000,
  },
  "Sleep" : {
    "when_operate": true,
    "min_mseconds_sleep_when_operate": 1,
    "max_mseconds_sleep_when_operate": 100,
  },
  "number_of_periods_after_to_send_notify": 1,
  "count_after_host_is_considered_as_alive": 1,
  // Если тщательную проверку не включать, то в случае если у вас некачественный интернет канал, вас засыпит уведомлениями, поэтому рекомендую включить
  "ThoughtfulMode" : {
    "Ping": true,
    "Port": true,
    "Web": true,
    "Agent": true
  }
}
```
### WebNNM

Пример config.json:
```
{
    "user": "sa",
    "password": "Qwerty123",
    "server": "LOCALHOST",
    "driver": "tedious",
    "database": "noname_network_monitor",
    "options": {
        "instanceName": "SQLEXPRESS"
    }
}
```

Пример public_config.json:
```
{
  // строить график пинга за последние Х минут
  "chart" : {
    "minutes": 30
  },
  // цвета для линий ан графике
  "colors": ["DarkViolet", "DimGray", "Black", "DarkGoldenRod", "DarkMagenta", "Lavender", "Blue", "LightPink", "DarkSalmon", "Tomato", "Tan", "DarkSlateGray", "DarkOrange", "LightBlue", "Indigo", "LightGray", "DeepPink", "DarkBlue", "LightGreen", "Chartreuse", "ForestGreen", "Maroon", "LawnGreen", "Aquamarine", "Gray", "MediumAquaMarine", "DodgerBlue", "Cyan", "CadetBlue", "LightSkyBlue", "SlateGray", "DarkGray", "DarkSlateBlue", "PaleGreen", "Silver", "Navy", "Khaki", "Chocolate", "LightSeaGreen", "Brown", "DarkRed", "GoldenRod", "AntiqueWhite", "SeaGreen", "Peru", "LightSlateGray", "LightCoral", "BurlyWood", "MediumVioletRed", "DarkSeaGreen", "CornflowerBlue", "GreenYellow", "DeepSkyBlue", "Green", "DarkOliveGreen", "LemonChiffon", "Aqua", "FireBrick", "IndianRed", "Plum", "DarkGreen", "SandyBrown", "Red", "DarkKhaki", "LightSalmon", "BlueViolet", "Fuchsia", "HotPink", "Coral", "DarkCyan", "LightGoldenRodYellow", "Gold", "DarkTurquoise", "Crimson"],
  "tables": ["interfaces", "hosts", "groups", "types_of_host_and_port", "hosts_and_ports", "subscribers", "hdd_partitions" ],
  "template_for_agent_stat": "<div class='' id='agent-stat'><h4 id='agent-name'></h4><div class='col-md-4' id='cpu-usage-chart' style='width: 300px; height: 200px; background-color: #FFFFFF;'></div><div class='col-md-4' id='memory-usage-chart' style='width: 300px; height: 200px; background-color: #FFFFFF;'></div><div id='network-usage-charts'><h5>Статистика интерфейсов</h5></div></div><div style='clear: left'><h5>Статистика разделов дисков</h5><div id='partitions-sizes-charts'></div></div>",
  "time_for_select": ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45", "00:50", "00:55", "01:00", "01:05", "01:10", "01:15", "01:20", "01:25", "01:30", "01:35", "01:40", "01:45", "01:50", "01:55", "02:00", "02:05", "02:10", "02:15", "02:20", "02:25", "02:30", "02:35", "02:40", "02:45", "02:50", "02:55", "03:00", "03:05", "03:10", "03:15", "03:20", "03:25", "03:30", "03:35", "03:40", "03:45", "03:50", "03:55", "04:00", "04:05", "04:10", "04:15", "04:20", "04:25", "04:30", "04:35", "04:40", "04:45", "04:50", "04:55", "05:00", "05:05", "05:10", "05:15", "05:20", "05:25", "05:30", "05:35", "05:40", "05:45", "05:50", "05:55", "06:00", "06:05", "06:10", "06:15", "06:20", "06:25", "06:30", "06:35", "06:40", "06:45", "06:50", "06:55", "07:00", "07:05", "07:10", "07:15", "07:20", "07:25", "07:30", "07:35", "07:40", "07:45", "07:50", "07:55", "08:00", "08:05", "08:10", "08:15", "08:20", "08:25", "08:30", "08:35", "08:40", "08:45", "08:50", "08:55", "09:00", "09:05", "09:10", "09:15", "09:20", "09:25", "09:30", "09:35", "09:40", "09:45", "09:50", "09:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45", "10:50", "10:55", "11:00", "11:05", "11:10", "11:15", "11:20", "11:25", "11:30", "11:35", "11:40", "11:45", "11:50", "11:55", "12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30", "12:35", "12:40", "12:45", "12:50", "12:55", "13:00", "13:05", "13:10", "13:15", "13:20", "13:25", "13:30", "13:35", "13:40", "13:45", "13:50", "13:55", "14:00", "14:05", "14:10", "14:15", "14:20", "14:25", "14:30", "14:35", "14:40", "14:45", "14:50", "14:55", "15:00", "15:05", "15:10", "15:15", "15:20", "15:25", "15:30", "15:35", "15:40", "15:45", "15:50", "15:55", "16:00", "16:05", "16:10", "16:15", "16:20", "16:25", "16:30", "16:35", "16:40", "16:45", "16:50", "16:55", "17:00", "17:05", "17:10", "17:15", "17:20", "17:25", "17:30", "17:35", "17:40", "17:45", "17:50", "17:55", "18:00", "18:05", "18:10", "18:15", "18:20", "18:25", "18:30", "18:35", "18:40", "18:45", "18:50", "18:55", "19:00", "19:05", "19:10", "19:15", "19:20", "19:25", "19:30", "19:35", "19:40", "19:45", "19:50", "19:55", "20:00", "20:05", "20:10", "20:15", "20:20", "20:25", "20:30", "20:35", "20:40", "20:45", "20:50", "20:55", "21:00", "21:05", "21:10", "21:15", "21:20", "21:25", "21:30", "21:35", "21:40", "21:45", "21:50", "21:55", "22:00", "22:05", "22:10", "22:15", "22:20", "22:25", "22:30", "22:35", "22:40", "22:45", "22:50", "22:55", "23:00", "23:05", "23:10", "23:15", "23:20", "23:25", "23:30", "23:35", "23:40", "23:45", "23:50", "23:55"]
}
```

## В разработке приложения использовались следующие ЯП и библиотеки
### Noname Network Web
* nodejs
* underscore.js
* expressjs
* strftime из js-methods
* express-ejs-layouts
* morrisjs
* jquery
* twitter bootstrap
* x-editable

### Noname Network Service
* C#
* Newtonsoft JSON.net

### NonameAgent
* C#

### linuxAgent - правда, об этом еще рано говорить
* ruby 

### Благодарю за стимуляцию в разработке :octocat:: 

* bychkov
* karamanov
* serdyukov
* stoyakin