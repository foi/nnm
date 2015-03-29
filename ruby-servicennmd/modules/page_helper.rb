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
          raw_notify_string = @configuration.notify_page_template.dup
          notify_string = format_notify_string raw_notify_string, {
            "{page}" => _.name,
            "{hostname}" => @hosts.where(id: _.host_id).first.name,
            "{size}" => ActiveSupport::NumberHelper.number_to_human_size(size),
            "{time}" => formatted_current_time 
            }
          # уведомлять только в случае, если надо
          if _.notify
            @mail_queue << notify_string
          end
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
    re_try do 
      timeout(@configuration.page_timeout) do 
        res = open(url)
        size = res.size
      end
    end
    size
  end

end