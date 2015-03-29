# encoding: utf-8
module AgentHelper
  
  private

  # считывание информации с агентов
  # принимается во вниманеи размер оперативной памяти,
  # который изменяется, если измененен размер на хосте
  # , а также объемы разделов жестких дисков
  def check_agent_collection agents
    $logger.info "Проверка агентов запущена."
    threads = [ ]
    agents.each do |agent|
      threads << Thread.new do
        begin
          timeout(@configuration.agent_timeout) do 
            url = form_url agent
            content = open(url).read
            agent_data = JSON.parse content
            # работа с памятью и цпу
            memory_work agent, agent_data
            # работа с интерфейсами
            interfaces_work agent, agent_data
            # работа с разделами
            partitions_work agent, agent_data
            # работа со статусами
            statuses_work agent, agent_data
            # наполнениe справочника со статусами
            end
         rescue Exception => e
           $logger.warn "Произошла ошибка во время обработки информации от агента: #{agent.name} - #{e}"
        end
      end
    end
    threads.map(&:join)
  end

  ##### методы для обработки агентов
  #### Память
  def memory_work agent, agent_data
    memory = @memory.where(host_with_port_id: agent.id).first
    if memory.nil?
      with_connection { RAM.create! host_with_port_id: agent.id, total: agent_data["Ram"]["TotalRam"] }
    elsif memory != agent_data["Ram"]["TotalRam"]
      with_connection { memory.update! total: agent_data["Ram"]["TotalRam"] }
    end
     # вставим данные оперативной памяти и загрузки цпу
    with_connection do
      CPURAMEntry.create! cpu_load: agent_data["CpuLoad"], used_ram: agent_data["Ram"]["UsedRam"], host_with_port_id: agent.id, period_id: @period_id
    end
  end

  ##### работа с интерфейсами
  def interfaces_work agent, agent_data
    interfaces = @interfaces.where host_with_port_id: agent.id
    guids = interfaces.pluck :guid
    # Просто добавим интерфейсы для хоста, если агент хоста впервые обнаружен
    if interfaces.empty?
      agent_data["Interfaces"].each do |interface|
        with_connection { Interface.create! name: interface["Name"], guid: interface["Guid"], host_with_port_id: agent.id }
      end
    # Если вдруг изменилось имя интерфейса или добавился новый
    else
      agent_data["Interfaces"].each do |interface|
        # Если интерфейс изменил имя
        if guids.include? interface["Guid"]
          old_interface = interfaces.where(guid: interface["Guid"]).first
          if old_interface.name != interface["Name"]
            old_interface.name = interface["Name"]
            old_interface.save!
          end
        else
          # Если просто добавился новый интерфейс
          with_connection { Interface.create! name: interface["Name"], guid: interface["Guid"], host_with_port_id: agent.id }
        end
      end
    end
    interfaces_id_guid = {}
    interfaces.each { |i| interfaces_id_guid[i.guid] = i.id }
    # теперь вводим статистику с интерфейсов
    agent_data["Interfaces"].each do |interface|
      id = interfaces_id_guid[interface["Guid"]]
      with_connection { InterfaceEntry.create! host_with_port_id: agent.id, period_id: @period_id, interface_id: id, upload: interface["UploadSpeed"], download: interface["DownloadSpeed"] }
    end
  end

  # Работа с разделами
  def partitions_work agent, agent_data
    # добавим разделы, если их нет. Изменим общий размер, если изменился
    partitions = @partitions.where host_with_port_id: agent.id
    if partitions.empty?
      agent_data["Disks"].each do |disk|
        with_connection { Partition.create! host_with_port_id: agent.id, letter: disk["Name"], total_space: disk["TotalSpace"] }
      end
    else 
      partitions_new = { } 
      agent_data["Disks"].each { |disk| partitions_new[disk["Name"]] = disk["TotalSpace"] }
      partitions_new.each do |k, v|
        _ = partitions.where("letter = ?", k).first
        if _.nil?
          with_connection { Partition.create! host_with_port_id: agent.id, letter: k, total_space: v }
        elsif _.total_space != v
          with_connection { _.update! total_space: v }
        end
      end
    end
    # теперь про наполнерие журнала с объемами разделов
    # если нет информации о занятом пространстве на разделе
    if @issues[:partitions][agent.id].nil?
      @issues[:partitions][agent.id] = { }
      agent_data["Disks"].each do |disk|
        @issues[:partitions][agent.id][disk["Name"]] = disk["UsedSpace"]
        id = partitions.where("letter = ?", disk["Name"]).first.id
        last_size_entry = PartitionEntry.where("partition_id = ? AND host_with_port_id = ?", id, agent.id).first
        # если с прошлого раза нет записи об этом разделе, то пишем
        if last_size_entry.nil?
          with_connection { PartitionEntry.create! period_id: @period_id, host_with_port_id: agent.id, size: disk["UsedSpace"], partition_id: id }
        end
        # вставим в базу объем занятого пространства
      end
    # если есть, но изменилось
    else
      agent_data["Disks"].each do |disk|
        if @issues[:partitions][agent.id][disk["Name"]] != disk["UsedSpace"]
          @issues[:partitions][agent.id][disk["Name"]] = disk["UsedSpace"]
          # будет ли он тут искать в отфильтрованном по хост вис порт или полностью
          id = partitions.where("letter = ?", [disk["Name"]]).first.id
          with_connection { PartitionEntry.create! period_id: @period_id, host_with_port_id: agent.id, size: disk["UsedSpace"], partition_id: id }
        end
      end
    end
  end

  # работа со статусами
  def statuses_work agent, agent_data
    if @issues[:services][agent.id].nil?
      @issues[:services][agent.id] = { }
      agent_data["Services"].each do |service|
        @issues[:services][agent.id][service["Name"]] = service["Working"]
      end  
    else
      # теперь посмотрим изменились ли статусы сервисов
      agent_data["Services"].each do |service|
        # Если появился новый сервис
        if @issues[:services][agent.id][service["Name"]].nil?
          @issues[:services][agent.id][service["Name"]] = service["Working"]
        elsif @issues[:services][agent.id][service["Name"]] != service["Working"]
          @issues[:services][agent.id][service["Name"]] = service["Working"]
          raw_notify_string = @configuration.notify_agent_template.dup
          status = service["Working"] ? "Работает" : "Остановлен"
          notify_string = format_notify_string raw_notify_string, { 
            "{agent}" => agent.name, 
            "{service}" => service["Name"], 
            "{status}" => status, 
            "{time}" => formatted_current_time
          }
          @mail_queue << notify_string
          # Внесем данные об изменении статуса в базу данных
          with_connection { ServiceEntry.create! host_with_port_id: agent.id, period_id: @period_id, status: (service["Working"] ? true : false ), service_id: @services.where(system_name: service["Name"]).first.id }
        end
      end
    end
    # вставка в базу новых сервисов, если их нет
    if @services.empty?
      agent_data["Services"].each do |service|
        with_connection { Service.create! system_name: service["Name"], readable_name: service["Name"] }
      end
    else
      agent_services = @issues[:services][agent.id].keys
      agent_services.each do |service|
        if @services.where(system_name: service).empty?
          with_connection { Service.create! system_name: service, readable_name: service }
        end
      end
    end
    # статусы сервисов тоже вставлять только если произошли изменения
  end

end