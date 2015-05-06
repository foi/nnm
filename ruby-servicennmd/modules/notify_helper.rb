# encoding: utf-8
module NotifyHelper
	# настройка pony mail для отправки писем
  def configure_pony_mail
    Pony.options = {
      :to => @subscribers,
      :from => @configuration.smtp_email,
      :via => :smtp,
      :via_options => {
        :address              => @configuration.smtp_server,
        :port                 => @configuration.smtp_port,
        :enable_starttls_auto => @configuration.smtp_secure,
        :user_name            => @configuration.smtp_email,
        :password             => @configuration.smtp_password,
        :authentication       => :login
      }
    }
  end

  # поток, который проверяет, если ли пробелмы, в случае их наличия отправляет сообщение на email
  def check_troubles_and_notify
    Thread.new do
      sleep KEYS[:INTERVAL] - 10
      $logger.info "Поток уведомлений инициализирован."
      loop do
        break if @stop
        begin
          while (subject = @mail_queue.pop(true) rescue nil) do
            sleep rand(0)
            $logger.info subject
            Pony.mail({subject: subject });  
          end
          sleep 10
        rescue Exception => e
          $logger.fatal "Ошибка во время уведомлений: #{e}"
        end
      end
    end
  end

end