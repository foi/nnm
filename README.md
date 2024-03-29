![http://www.dafont.com/xxii-ultimate-black-metal.font?text=nonamenetworkmonitor&fpp=50&af=on&psize=l](https://www.dropbox.com/s/nfgb8z6zywg7m40/nonamenetworkmonitorlogo.png?dl=1 "noname network monitor")

Noname Network Monitor
=====================

### Важные изменения проекта 

22.03.2015 года была создана ветка [legacy](https://github.com/foi/nnm/tree/legacy), где распологается версия сервиса написанная на C# и веб-интерфейса на nodejs, использующие SQL SERVER, теперь это является наследием в связи с переориентацией проекта на linux-платформу. В текущей версии [master](https://github.com/foi/nnm/tree/master) ветке сервис и веб-интерфейс был переписан на ruby, а в качестве БД в приоритете MariaDB. 

### Релизы

#### Legacy

[v0.3.1 - скачать](https://www.dropbox.com/s/lm1bh2ranfgn3xx/nnm_v0.3.1.tar.gz?dl=1)

#### Master

[v0.4.1 - скачать](https://www.dropbox.com/s/l7z3a0k9j8s9l9j/nnm_0.4.1.tar.gz?dl=1)

[v0.4.2 - скачать](https://www.dropbox.com/s/ckzhwgiduczk1ge/nnm_0.4.2.tar.gz?dl=1)

* не решена проблема оформления ruby-servicennmd как сервиса. Ребят, фиг его знает, системд глючит или я. Не получается. [Решение проблемы!](http://stackoverflow.com/questions/26247926/how-to-solve-usr-bin-env-ruby-executable-hooks-no-such-file-or-directory)

===========
# Интро

В первую очередь приложение разрабатывается для моей работы. Решения на основе zabbix, cacti чрезмерно сложны, да и не нравятся они мне, древность.

## Что необходимо?

* ruby 2.x - замечено, что ruby 2.0.0 потребляет в 2 раза меньше памяти, чем 2.1 или 2.2, поэтому лучше использовать ее (рекомендую использовать rbenv)
* gem install bundler
* mariadb (nnm точно работает на ветке 5.5) [инструкция по её установке](https://stavrovski.net/blog/install-and-configure-nginx-mariadb-php-fpm-in-centos-7-rhel7)
* bundler (``` gem install bundler ```)

## Перед запуском

* дать права на запись в директории ruby-servicennmd и ruby-webnnmd ``` chmod -R 777 ruby-servicennmd ```, ``` chmod -R 777 ruby-webnnmd ```
* установить владельца папок в приложениями ``` chown -R someuser:somegroup ruby-servicennmd ```, ``` chown -R someuser:somegroup ruby-webnnmd ```
* все команды выполняем с ``` sudo ```
* установим необходимые зависимости командой (ruby-servicennmd, ruby-webnnmd) ``` bundler ``` в каждой из папок (Gemfile.lock есть в папках - т.е. те версии, с которыми 100% будет работать)

## Создание базы данных

* Необходимо создать базу данных и добавить пользователя (можно и не добавлять, а использовать root аккаунт) для доступа к ней: ``` mysql -u root -p ```, ``` CREATE DATABASE noname_network_monitor CHARACTER SET utf8; ```
* Настроить параметры для подключения к БД в файле ``` ruby-servicennmd/config/database.json ```
* перейти в ruby-servicennmd и выполнить ``` rake ```

## Запуск
* ruby ruby-servicennmd/start_servicennmd.rb - запустит сервис в фоне
* cd ruby-webnnmd, puma -d -e production -p 80
* Ну а агент через системд скрипт (если на линуксе), а на винде с помощью nssm служба делается


## Смысл

Мониторинг доступности пингом, получение информации от агентов о загрузке ЦП, памяти, и т.д., проверка размера веб-страниц.

## Баги

* Утечка памяти связанная с тем, что это ruby. На 2.0.0 используется терпимое количество оперативной памяти сервисом ruby-servicennmd. Т.е. прибавляет где-то 1МЬ в день. На 2.1/2.2 ситуация хуже, где-от по 2-4МБ в день. Я не знаю с чем это связано в моем коде, склоняюсь что дело в сборщике мусора в принципе. Можно замутить крон задание, которая бы рестартавал сервис....
* На системах откличных от системд должнен работать agentnnmd-linux, но я не проверял
* Иногда ruby-servicennmd падал, были задеркжи в IO операциях, похоже причина в [TCP_NODELAY](http://stackoverflow.com/questions/16776975/ruby-socket-performance-characteristics)  

## Итак

Система состоит из трех модулей: 
* агент для windows (c#) agentnnmd
* агент для линукс (go) пока что поддерживается только systemd и x64 (если кто подскажет как проверять статус сервиса на upstart или SysV, добавлю конечно)
* служба (ruby) ruby-servicennmd
* веб-интерфейс (ruby, angularjs) ruby-webnnmd

Возможности:
 - считывание информации с хостов с периодичностью в 1 минуту;
 - уведомление по email об [не]доступности хоста, порта (...) в течение X минут;
 - Проверка размера веб-страниц и отсылка уведомления об его изменении на email
 - статистика задержек пинга
 - веб-интерфейс для конфигурирования и просмотра статистики

## Пофиксить
 - Ошибки в проверке размера веб-страниц

## Как использовать

Есть 3 версии AgentNNM:

* AgentNNM for .net 3.5 для древнего и остойнейшего .net framework 3.5 (обладает ограниченным функционалом и немного большим откликом, в случае большого количества сетевых интерфейсов)
* AgentNNM для .net framework 4 + с блекджеком и шлюхами (есть возможность мониторить список хостов и размеры страницы удаленных хостов и отсылка уведомлений)
* agentnnmd-linux x64. Перед запуском следует подправить config.json выбрать порт, systemd сервисы, которые нужно мониторить, сделать файл agentnnmd испольняемым, открыть порт, поправить пути в файле agentnnmd.service, сделать его испольняемым, скопировать в папку с стартап скриптами systemd, systemctl daemon-reload, systemctl enable agentnnmd, systemctl start agentnnmd.

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

Конфигурация агента хранится в файле _config.json_. Перед первым запуском нужно переименовать config.json.example в config.json

## Установка как службы ruby-webnnmd т.е. веб-интерфейса

Установка в качестве службы выполняется при помощи утилиты [non sucking service manager (описание примера настройки на английском)](https://nssm.cc/usage), [Описание примера настройки на русском](http://nix-sa.blogspot.ru/2013/05/windows-nssm.html).  

Как выглядит веб-интерфейс WebNNM:

![Справочники](https://www.dropbox.com/s/ks3bddfdimh4i8q/dict.JPG?dl=1)
![Страница HOT](https://www.dropbox.com/s/we6eg5umd5dfj8y/Hot_page.JPG?dl=1)
![Конфигурация](https://www.dropbox.com/s/x4j0bh6sph69d9h/config.JPG?dl=1)


## Установка демона агента как службы

Доописать!!

![1](https://www.dropbox.com/s/rq3kw7tm1o7sx2q/1.png?dl=1)
![2](https://www.dropbox.com/s/mfjrr5qhi3tr9ic/2.png?dl=1)
![3](https://www.dropbox.com/s/1sl0i3v33evzd7f/3.png?dl=1)


## В разработке приложения использовались следующие ЯП и библиотеки
### ruby-webnnmd
* ruby
* activerecord
* sinatra
* twitter bootstrap
* angularjs
* angular x-editable
* :heartbeat: c3js :heartbeat:

### ruby-servicennmd
* ruby
* activerecord

### agentnnmd
* C#

### Благодарю за стимуляцию в разработке :octocat:: 

* bychkov
