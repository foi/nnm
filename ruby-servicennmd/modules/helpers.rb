# encoding: utf-8
module Helpers
  
  private

  def format_notify_string string, name_value
    name_value.each do |k, v|
      if string.include? k
        string[k] = v
      end
    end
    string
  end

  # Зареигстрировать проблемы
  # Если результат будет равен нулю, тогда инкрементируем для этого ИД значение
  # если стало любое число = обнуляем счетчик
  def register_trouble type, result, id

    last_value = @trouble_counters[type][id].nil? ? 0 : @trouble_counters[type][id]

    perform = false
    perform = true if (type == :ping && result.zero?)
    perform = true if (type == :port && result == false)
      
    if perform
      if @trouble_counters[type][id].nil?
        @trouble_counters[type][id] = 1
      else
        @trouble_counters[type][id] += 1
      end
    else
      @trouble_counters[type][id] = 0
    end
    # Уведомить, если порт или хост недоступен более чем
    if @trouble_counters[type][id] == @configuration.notify_after_period_n
      raw_notify_string = if type == :ping
                            @configuration.notify_host_template.dup  
                          else
                            @configuration.notify_port_template.dup
                          end
      notify_string = format_notify_string raw_notify_string, { 
        "{hostname}" => type == :ping ? @hosts.where(id: id).first.name : "",
        "{status}" => "недоступен",
        "{fail_time}" => "#{@trouble_counters[type][id]} минут",
        "{time}" => formatted_current_time,
        "{port_name}" => type == :port ? HostWithPort.where(id: id).first.name : "" 
        }
      @mail_queue << notify_string
    elsif @trouble_counters[type][id].zero? && !last_value.zero?
      raw_notify_string = type == :ping ? @configuration.notify_host_alive_template : @configuration.notify_port_template
      notify_string = format_notify_string raw_notify_string, { 
        "{hostname}" => type == :ping ? @hosts.where(id: id).first.name : "",
        "{status}" => "доступен",
        "{fail_time}" => "#{@trouble_counters[type][id] + 1} минут",
        "{time}" => formatted_current_time,
        "{port_name}" => type == :port ? HostWithPort.where(id: id).first.name : ""
        }
      @mail_queue << notify_string
    end

  end

  def formatted_current_time
    time = Time.now
    time.strftime("%T %d.%m.%y")
  end

  def do_in_sixty_seconds
    loop do    
      init_time = Time.now
      yield
      end_time = Time.now
      sleep_sec = $SHARED_CONSTANTS[:INTERVAL] - (end_time - init_time)
      $logger.info "*" * 30 + " sleep - #{sleep_sec} sec. " + "*" * 30
      break if @stop
      sleep sleep_sec
    end
  end

  # в случае проверки портов и размера страниц, то
  # писаться должно только в том случае, если прошлый
  # раз было отличное значение
  def is_any_changes? issues, e, new_value
    hmm = false
    if issues[e.id].nil?
      issues[e.id] = new_value
      hmm = true
    elsif issues[e.id] != new_value
      issues[e.id] = new_value
      hmm = true
    end
    hmm
  end

  # метод, который пытается снова,
  # количество попыток зависит от конфига
  def re_try
    tries = @configuration.tries
    begin
      sleep(rand(@configuration.sleep_min..@configuration.sleep_max)) if @configuration.sleep
      yield
    rescue Exception => e
      $logger.warn "Произошла ошибка: #{e}"
      tries -= 1
      retry if !tries.zero?
    end
  end
  # http://stackoverflow.com/questions/24187952/activerecord-with-ruby-script-without-rails-connection-pool-timeout
  def with_connection
    ActiveRecord::Base.connection_pool.with_connection do
      yield
      ActiveRecord::Base.connection_pool.release_connection
    end
  end

   # формирование URL - если тип проверка старницы, то порт 443 будет заменен на https, а 80 на http
  # в случае если это полученеи информации от агента то протокол будет всегда http, а порт то указан
  def form_url raw
    url = ""
    raw.port == 443 ? url += "https://" : url += "http://"
    url += @hosts.where(id: raw.host_id).first.address
    if raw.type_id == $SHARED_CONSTANTS[:TYPE_AGENT_ID]
      url += ":" + raw.port.to_s
    else 
      if raw.route
        url += raw.route
      else
        url += "/"
      end
    end
    URI.parse url
  end
  
end