module SystemPingHelper

  # ping возвратит количество мс
  def system_ping host, timeout
    Open3.popen3("ping", "-c", "1", "-W", timeout.to_s, host.to_s) do |stdin, stdout, stderr, thread|
      stdin.close
      raw = stdout.read
      splitted_result = raw.split(/ /)
      duration = splitted_result.select {|s| s.include? "time="}[0].delete("time=").to_f.to_i
      duration < 1 ? 1 : duration
    end
  end

end
