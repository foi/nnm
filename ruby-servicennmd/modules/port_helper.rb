# encoding: utf-8
module PortHelper

  private

  def check_port_collection for_check_port
    threads = [ ]
    $logger.info "Запущена проверка портов."
    for_check_port.each do |_|
      threads << Thread.new do
        status = check_port @hosts.where(id: _.host_id).first.address, _.port, _.id
        if is_any_changes? @issues[:port], _, status
          with_connection do 
            PortEntry.create! host_with_port_id: _.id, period_id: @period_id, is_alive: status
          end
        end
      end
    end
    threads.each(&:join)
  end

  # http://stackoverflow.com/questions/1746177/ruby-how-to-know-if-script-is-on-3rd-retry
  def check_port host, port, id
    result = false
    re_try do
      timeout(@configuration.port_timeout) do 
        TCPSocket.new(host, port).close
        result = true
      end
    end
    register_trouble :port, result, id
    result
  end
end