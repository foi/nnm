module SystemPingHelper

  # ping возвратит количество мс
  def system_ping host, timeout
    raw = IO.popen "ping -c 1 -W #{timeout} #{host} 2>&1"
    result = raw.read
    Process.wait raw.pid
    if result.size < 30
      0
    else
      splitted_result = result.split(/ /)
      duration = splitted_result.select {|s| s.include? "time="}[0].delete("time=").to_f.to_i 
      duration < 1 ? 1 : duration
    end
  end

end
