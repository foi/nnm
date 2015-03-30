# encoding: utf-8
module ResponseTimeHelper
  # Измерить время отклика у массива  хостов
  def measure_response_time_urls urls
    $logger.info "Измерение времени отклика сетевых ресурсов"
    threads = [ ]
    @response_statistics = { }
    urls.each do |url|
      threads << Thread.new do
        @response_statistics[url.id] = []
        measure_response_time url
      end
    end
    threads.map &:join
    # очистим от нулей
    @response_statistics.map {|k, v| v.delete(0) }
    # введем статистику с базу
    @response_statistics.each do |k, v|
      time = 0
      if v.size.eql? 0
        time = 0 
      else
        time = (v.reduce(:+).to_f / v.size).round
      end
      $logger.info "#{k} - #{time}"
      ResponseEntry.create! period_id: @period_id, time: time, host_with_port_id: k
    end
  end
  # Измерить время отклика от веб-ресурса
  def measure_response_time url
    normalized_url = form_url url
    $logger.info normalized_url
    # Сколько раз измерять для вычисления среднего значения
    @configuration["response_time_avg_from"].times do 
      @response_statistics[url.id] << get_page(normalized_url)
      $logger.info @response_statistics
    end
  end

  def get_page url
    time = 0
    begin
      sleep(rand(@configuration.sleep_min..@configuration.sleep_max)) if @configuration.sleep
      start = Time.now.to_f * 1000
      timeout(@configuration.response_time_timeout) do 
        open(url).read
      end
      stop = Time.now.to_f * 1000
      time = (stop - start).abs.round 
    rescue
      nil
    end
    time
  end

end