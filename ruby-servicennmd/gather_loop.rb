# encoding: utf-8
class GatherLoop

  extend Helpers
  extend PingHelper
  extend PortHelper
  extend PageHelper
  extend AgentHelper
  extend NotifyHelper

  @stop = false

  def self.start
    # хэш с тем, произошли  ли изменения
    @issues = { 
      services: { },
      port: { },
      page: { },
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
      threads << Thread.new do 
        check_page_collection @pages
      end
      threads << Thread.new do
        check_agent_collection @agents
      end
      threads.map(&:join)
      p @trouble_counters
      p @issues
      p @mail_queue.length
    end

  end

  def self.stop
    @stop = true
    $logger.info "Приложение остановлено."
  end

  private 

  def self.init_dictionaries
    @subscribers = Subscriber.all.pluck :email
    period = Period.create! period: Time.now
    @period_id = period.id
    @hosts = Host.all
    @agents = HostWithPort.where(type_id: $SHARED_CONSTANTS[:TYPE_AGENT_ID])   
    @ports = HostWithPort.where(type_id: $SHARED_CONSTANTS[:TYPE_PORT_ID])
    @pages = HostWithPort.where(type_id: $SHARED_CONSTANTS[:TYPE_PAGE_ID]) 
    @interfaces = Interface.all  
    @memory = RAM.all
    @services = Service.all
    @partitions = Partition.all
  end

end