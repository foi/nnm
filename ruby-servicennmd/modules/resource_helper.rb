# encoding: utf-8
module ResourceHelper
  # Измерить время отклика у массива  хостов
  def check_resource_collection urls
    $logger.info "Измерение времени отклика сетевых ресурсов"
    threads = [ ]
    @response_statistics = { }
    @sizes = { }
    urls.each do |url|
      threads << Thread.new do
        @response_statistics[url.id] = []
        @sizes[url.id] = 0
        measure_response_time url
      end
    end
    threads.map &:join
    #$logger.info @response_statistics
    # очистим от нулей
    @response_statistics.map {|k, v| v.delete(0) }


    # введем статистику с базу
    @response_statistics.each do |k, v|
      time = if v.size.eql? 0
               0
             else
               (v.reduce(:+).to_f / v.size).round
             end

      with_connection { ResourceEntry.create! period_id: @period_id, response_time: time, host_with_port_id: k, size: @sizes[k]  }

      if is_any_changes? @issues[:resource], k, @sizes[k]
        page = @resources.where(id: k).first
        raw_notify_string = @configuration.notify_resource_template.dup
        notify_string = format_notify_string raw_notify_string, {
          "{resource}" => page.name,
          "{hostname}" => @hosts.where(id: page.host_id).first.name,
          "{size}" => ActiveSupport::NumberHelper.number_to_human_size(@sizes[k]),
          "{time}" => formatted_current_time
        }
        # уведомлять только в случае, если надо
        if page.notify
          @mail_queue << notify_string
        end
      end
    end

  end
  # Измерить время отклика от веб-ресурса
  def measure_response_time url
    normalized_url = form_url url
    # Сколько раз измерять для вычисления среднего значения
    @configuration["response_time_avg_from"].times do
      @response_statistics[url.id] << get_page(normalized_url, url.id)
      $logger.info @response_statistics
    end
  end

  def get_page url, key
    time = 0
    begin
      sleep(rand(@configuration.sleep_min..@configuration.sleep_max)) if @configuration.sleep
      start = Time.now.to_f * 1000
      Timeout::timeout(@configuration.resource_timeout) do
        #$logger.info url
        _ = open(url).read
        #$logger.info _
        @sizes[key] = if _.size.eql? 0
                        0
                      else
                        _.size
                      end
      end
      stop = Time.now.to_f * 1000
      time = (stop - start).abs.round
    rescue
      nil
    end
    time
  end

end
