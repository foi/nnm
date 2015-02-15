![http://www.dafont.com/xxii-ultimate-black-metal.font?text=nonamenetworkmonitor&fpp=50&af=on&psize=l](https://www.dropbox.com/s/nfgb8z6zywg7m40/nonamenetworkmonitorlogo.png?dl=1 "noname network monitor")

noname Network Monitor
=====================

### Релизы

[v0.1 - скачать](https://dl.dropboxusercontent.com/u/5433393/github/nonamenetworkmonitor/releases/NonameNetworkMonitor.v0.1.zip)
- начальный релиз, кстати при первоначальной устновке есть проблема, что в package.json чего-то не хватает

[v0.2 - скачать](https://www.dropbox.com/s/wqw28g8cxx2muc1/nnm_0.2.zip?dl=1)
- веб-интерфейс переписан с jquery на angularjs
- дял графиков вместо morrijs используется c3
- добавлена возможность изменять конфигурацию и серввиса и веб-интерфейса из WebNNM
- еще какие-то мелочи, даже и не помню
[v0.3 - скачать](https://www.dropbox.com/s/wqw28g8cxx2muc1/nnm_0.3.zip?dl=1)
- агенты теперь тупо консольная утилита, для того, чтобы их удобно было оформлять в качестве службы nssm
- вырезан интерфейс конфигурации config.json в отдельную программу agentconfig

===========
# Интро

Для платформы  Шindoшs крайне мало приложений для мониторинга сети, а если и есть, то они как правило платные. Вот и вся мотивация. А, да, в первую очередь система разрабатывается для моей работы.

_Это мое первое в жизни приложение, написанное с использованием c# и nodejs_

## Что необходимо?

* любой Windows - x86, x64
* .net framework 4.5 для ServiceNNM и 3.5 как минимум для агента
* [nodejs 0.10.36 +](http://nodejs.org/download/) или [iojs 1.0.4 +](https://iojs.org/), node должна находится в PATH
* MS SQL SERVER 2014, 2012 (на версиях ниже не проверял, но скорее всего все будет ок)
* утилита [Non-Sucking Service Manager](https://nssm.cc/download) для оформления как службой ServiceNNM и WebNNM
* Если вы любитель IIS, и желате чтобы WebNNM работал на нем, то нужны модули [URL REWRITE](http://www.iis.net/downloads/microsoft/url-rewrite), [ARR](http://www.iis.net/downloads/microsoft/application-request-routing), [IISNODE](https://github.com/tjanczuk/iisnode)

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
* агент для windows (c#) AgentNNM, //агент для *nix будет позже//
* служба windows (c#) ServiceNNM
* веб-интерфейс (nodejs/io.js, javascript) WebNNM

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

Агент используется вместе с ServiceNNM

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

Первое, что необходимо сделать, это перейти в папку с WebNNM и установить необходимые модули командой *npm install*

Установка в качестве службы выполняется при помощи утилиты [non sucking service manager (описание примера настройки на английском)](https://nssm.cc/usage), [Описание примера настройки на русском](http://nix-sa.blogspot.ru/2013/05/windows-nssm.html).  

В качестве альтернативы можно использовать [iisnode](https://github.com/tjanczuk/iisnode) модуль. 

Как выглядит веб-интерфейс WebNNM:

![Справочники](https://www.dropbox.com/s/4g5h33sktbumc0s/nnmdictionaries.png?dl=1)
![Статистика за последние Х минут](https://www.dropbox.com/s/7lx6zmx520vw3gq/c3jschartsHot.png?dl=1)
![Конфигурация](https://www.dropbox.com/s/647dj5ueszy6jmx/nnmconfig.png?dl=1)

*Для того, чтобы WebNNM могла останавливать/запускать службу, ее необходимо запускать от имени администратора*


**Для работы веб-интерфейса необходимо чтобы служба обозревателя SQL Server была запущена, а также в Сетевой конфигурации SQL SERVER должен быть включен протокол TCP/IP**

**Перед первым запуском веб-интерфейса необходимо выполнить команду npm update из каталога WebNNM**

## Установка демона агента как службы

Доописать!!

![1](https://www.dropbox.com/s/rq3kw7tm1o7sx2q/1.png?dl=1)
![2](https://www.dropbox.com/s/mfjrr5qhi3tr9ic/2.png?dl=1)
![3](https://www.dropbox.com/s/1sl0i3v33evzd7f/3.png?dl=1)

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
  }
}
```

## В разработке приложения использовались следующие ЯП и библиотеки
### WebNNM
* nodejs/io.js
* underscore.js
* expressjs
* strftime из js-methods
* twitter bootstrap
* angularjs
* angular x-editable
* :heartbeat: c3js :heartbeat:

### ServiceNNM
* C#
* Newtonsoft JSON.net

### NonameAgent
* C#

### Благодарю за стимуляцию в разработке :octocat:: 

* bychkov
* karamanov
* serdyukov
* stoyakin