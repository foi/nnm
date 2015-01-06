class SystemInfo
  @@overall_data = {}

  def self.get
    update
    @@overall_data
  end

  private

  def self.update
    # get memory data
    raw = %x(free)
    splitted_mem_data = raw.split(" ")
    @@overall_data = { "Ram" => { "TotalRam" => splitted_mem_data[7].to_i / 1024, "UsedRam" => splitted_mem_data[8].to_i / 1024 } }
    # get info about mount points
    raw_fs_data = %x(df -h).split(" ")
    i = 8
    @@overall_data["Disks"] = []
    while i < raw_fs_data.size do
      if (raw_fs_data[i])[raw_fs_data[i].size - 1] == "G"
        @@overall_data["Disks"] << { 
          "TotalSpace" => from_letter_to_size(raw_fs_data[i]), 
          "UsedSpace" => from_letter_to_size(raw_fs_data[i + 1]), 
          "Name" =>  raw_fs_data[i + 4]
        }
      end
      i = i + 6
    end
    # get info about zpu utilization
    
    # get interface data
    @@overall_data["Interfaces"] = []
    @_f, @_s = [], []
    t = Thread.new { get_cpu_load }
    get_network_stat
    t.join
    _ = 20
    while _ < @_f.size do 
      @@overall_data["Interfaces"] << {
        "Name" => @_f[_],
        "Guid" => @_s[_]

      }
    end

  end

  def self.from_letter_to_size str
    result = 0
    if str.size > 0
      if str[str.size - 1] == "M"
        result = str.chop.to_i / 1024
      elsif str[str.size - 1] == "G"
        result = str.chop.to_i
      end
    end
    result
  end

  def self.get_cpu_load
    @@overall_data["CpuLoad"] = `top -b -n2 | grep "Cpu(s)"| tail -n 1 | awk '{print $2 + $4}'`.to_i
  end

  def self.get_network_stat
    @_f = `cat /proc/net/dev`.split " " 
    sleep 1
    @_s = `cat /proc/net/dev`.split " " 
  end
end
t = Time.now
puts SystemInfo.get
p "#{Time.now - t}"