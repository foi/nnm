# encoding: utf-8
module ResponseTimeHelper
  # Измерить время отклика у массива  хостов
  def measure_response_time_urls urls
    $logger.info "Измерение времени отклика сетевых ресурсов"
    threads = [ ]
    urls.each do |url|
      threads << Thread.new do 
        normalized_url = form_url url
        measure_response_time normalized_url
      end
    end
    threads.map &:join
  end
  # Измерить время отклика от веб-ресурса
  def measure_response_time url
    # Сколько раз измерять для вычисления среднего значения
    @configuration["response_time_avg_from"].times do 
      data ||= []
      data << get_page(url)
      $logger.info data
    end
  end

  def get_page url
    time = 0
    begin
      start = Time.now.to_f * 1000
      open(url).read
      stop = Time.now.to_f * 1000
      time = (stop - start).abs.round 
    rescue
      nil
    end
    time
  end

end