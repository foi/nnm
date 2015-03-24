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
  TYPE_PORT_ID: 2,
  TYPE_RESPONSE_ID: 4
}

# Чтобы не было проблем с проверкой https страниц с неподписаным сертификатом
OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

config = JSON.load File.open("config/database.json")

%w{logger models modules/helpers modules/ping_helper modules/port_helper modules/page_helper modules/agent_helper modules/notify_helper gather_loop}.each do |file|
  require file
end

$logger = Logger.new 'log/nnm-service.log', 'daily'

begin
  ActiveRecord::Base.establish_connection config
  $logger.info "Соединение с БД успешно установлено!"
rescue Exception => e
  $logger.fatal "Проблема при подключении к БД #{e}"
end

begin
  GatherLoop.start
rescue Exception => e
  $logger.fatal "Сервис NNM упал: #{e}"
  GatherLoop.stop
  sleep 60
  retry
end