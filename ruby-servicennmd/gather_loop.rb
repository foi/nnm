# encoding: utf-8
class GatherLoop

  extend Helpers
  extend PingHelper
  extend PortHelper
  extend ResourceHelper
  extend AgentHelper
  extend NotifyHelper
  extend SystemPingHelper
  # Чтобы не было проблем с проверкой https страниц с неподписаным сертификатом
  OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

  @KEYS = {
    INTERVAL: 60,
    TYPE_AGENT_ID: 3,
    TYPE_PAGE_ID: 1,
    TYPE_PORT_ID: 2
  }

  @stop = false

  def self.start

    # хэш с тем, произошли  ли изменения
    @issues = {
      services: { },
      port: { },
      resource: { },
      partitions: { }
    }

    @trouble_counters = {
      ping: { },
      port: { },
    }

    @mail_queue = Queue.new

    @period_id = 0
    @configuration = Configuration.first
    # запустим потом с уведомлениями

    # запустим поток с уведомлениями
    check_troubles_and_notify
    do_in_sixty_seconds do
      # инициализируем все справочники
      init_dictionaries
      # конфигурируем почту
      configure_pony_mail

      threads = [ ]
      threads << Thread.new do
        ping_collection @hosts
      end
      threads << Thread.new do
        check_port_collection @ports
      end
      # измерение времени отклика от ресурсов по url и их размер
      threads << Thread.new do
        check_resource_collection @resources
      end
      threads << Thread.new do
        check_agent_collection @agents
      end
      threads.map(&:join)
      # $logger.info @trouble_counters
      # $logger.info @issues
      # $logger.info @mail_queue.length
      # performance_logging
    end

  end

  def self.stop
    @stop = true
    $logger.info "Приложение остановлено."
  end

  private

  def self.init_dictionaries
    with_connection do
      @subscribers = Subscriber.all.pluck :email
      period = Period.create! period: Time.now
      @period_id = period.id
      @hosts = Host.all
      @agents = HostWithPort.where(type_id: @KEYS[:TYPE_AGENT_ID])
      @ports = HostWithPort.where(type_id: @KEYS[:TYPE_PORT_ID])
      @resources = HostWithPort.where(type_id: @KEYS[:TYPE_PAGE_ID])
      @interfaces = Interface.all
      @memory = RAM.all
      @services = Service.all
      @partitions = Partition.all
    end
  end

  def self.performance_logging
    $logger.info "Всего использовано памяти: #{ObjectSpace.memsize_of_all} \n Использует ActiveRecord: #{ObjectSpace.memsize_of(ActiveRecord)} \n Статистика GC: #{GC.stat} \n"
    $logger.info "Самые большие объекты #{find_top_memory_eaters(20)}"

  end

end
