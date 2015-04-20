# encoding: utf-8

$LOAD_PATH << Dir.pwd

require 'rubygems'
require 'bundler/setup'

Bundler.require(:default)

# КОНСТАНТЫ
$SHARED_CONSTANTS = {
  INTERVAL: 60,
  TYPE_AGENT_ID: 3,
  TYPE_PAGE_ID: 1,
  TYPE_PORT_ID: 2
}

config = JSON.load File.open("config/database.json")

%w{logger models modules/helpers modules/ping_helper modules/port_helper modules/agent_helper modules/notify_helper modules/resource_helper modules/system_ping_helper gather_loop}.each do |file|
  require file
end

$logger = Logger.new 'logs/nnm-service.log', 3, 1024000

begin
  ActiveRecord::Base.establish_connection config
  $logger.info "Соединение с БД успешно установлено!"
rescue Exception => e
  $logger.fatal "Проблема при подключении к БД #{e.message}"
end

begin
  GatherLoop.start
rescue Exception => e
  $logger.fatal "Сервис NNM упал: #{e.message} - #{e.backtrace}"
  GatherLoop.stop
  sleep 60
  retry
end