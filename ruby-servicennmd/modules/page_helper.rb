# encoding: utf-8
module PageHelper

  private

  def check_page_collection pages
    threads = [ ]
    $logger.info "Началась проверка размеров страниц."
    pages.each do |_|
      threads << Thread.new do
        url = form_url _
        size = check_size url
        if is_any_changes? @issues[:page], _, size
          p "Есть изменения в размере страницы #{_.name} - #{Time.now}"
          raw_notify_string = @configuration.notify_page_template.dup
          notify_string = format_notify_string raw_notify_string, {
            "{page}" => _.name,
            "{hostname}" => @hosts.where(id: _.host_id).first.name,
            "{size}" => ActiveSupport::NumberHelper.number_to_human_size(size),
            "{time}" => formatted_current_time 
            }
          p notify_string
          @mail_queue << notify_string
          with_connection do 
            PageEntry.create! host_with_port_id: _.id, size: size, period_id: @period_id
          end
        end
      end
    end 
    threads.map(&:join)
  end

  def check_size url
    size = 0
    puts "Начало открытия страницы #{url}"
    re_try do 
      timeout(@configuration.page_timeout) do 
        res = open(url)
        size = res.size
      end
    end
    size
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