# encoding: utf-8
module PingHelper

  private 

  class PingError < StandardError
  end

  def ping_collection hosts
    p "Началась проверка хостов  - #{Time.now}"
    threads = []
    hosts.each do |host|
      threads << Thread.new do 
        latency = ping host.address, host.id
        with_connection do 
          PingEntry.create!(host_id: host.id, latency: latency, period_id: @period_id)
        end
      end
    end
    threads.map(&:join)
  end

  def ping address, id
    result = 0
    re_try do
      result = unaccurate_ping address 
    end
    register_trouble :ping, result, id
    result 
  end

  def unaccurate_ping address
    timeout(@configuration.ping_timeout) do
      _ = Net::Ping::External.new address, nil, @configuration.ping_timeout
      _.ping
      raise PingError if _.duration.nil?
      in_ms _.duration
    end
  end

  def in_ms duration
    l = (duration.round(3) * 1000).to_i
    l > 1 ? l : 1
  end

end