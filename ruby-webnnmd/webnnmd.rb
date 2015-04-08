# затребуем общие модели!
require "../ruby-servicennmd/models"

require "sinatra/base"

require 'active_support/all'

config = JSON.load File.open("../ruby-servicennmd/config/database.json")

puts "connect to db ok" if ActiveRecord::Base.establish_connection config

class WebNNMd < Sinatra::Base

  # отключить показ ошибок
  set :show_exceptions => false

  configure do
    @config = Configuration.first 
  end


  helpers do
    def ppp object
      puts object.inspect
    end

    # вычислить среднее число из массива int
    def get_average_from array
      if array.first.nil?
        "Нет данных"
      else
        array[1..array.size].compact.reduce(:+) / array[1..array.size].compact.size
      end
    end

    # получить список полей, что уникальны, которые нельзя модифицировать
    def get_unique_fields model_name
      validations = model_name.validators
      fields = []
      validations.each do |v|
        if v.kind_of? ActiveRecord::Validations::UniquenessValidator
          fields = v.attributes.map &:to_s
        end
      end
      fields
    end

    # получить класс из строки
    def get_class_from_string string
      if string.eql? "hostswithports"
        return HostWithPort
      else
        return Object.const_get(string.singularize.titleize)
      end
    end

    # данные для построения графиков пинга
    def get_data_for_ping_chart periods
      periods_ids = periods.map &:id
      ping_data_for_periods = PingEntry.where(period_id: (periods_ids.first..periods_ids.last)).where(host_id: @ids_string) 
      missed_periods = { }
      # добавим недостающие периоды
      @ids_string.each do |host_id|
        _ = ping_data_for_periods.where(host_id: host_id).pluck :period_id
        diff = periods_ids - _
        if !diff.empty?
          diff.each do |e| 
            ping_data_for_periods << PingEntry.new(period_id: e, host_id: host_id, latency: nil) 
          end
        end
      end
      # отсортируем по period_id
      ping_data_for_periods = ping_data_for_periods.sort_by { |e| e.period_id }
      # заменим все 0 на nil
      fill_zeros_by_nil ping_data_for_periods, "latency"
      # группируем по host_id
      grouped_ping_data = ping_data_for_periods.group_by { |e| e.host_id }
      ping_data_with_head = []
      grouped_ping_data.each do |pk, pv|
        tmp = [Host.where(id: pk).first.name]
        pv.each do |_|
          tmp << _.latency
        end
        ping_data_with_head  << tmp
      end
      # сформируем массив с периодами
      periods_array = correct_dates periods
      ping_data_with_head << periods_array
      ping_data_with_head.to_json
    end

    # заменить 0 на nil
    def fill_zeros_by_nil hash, field
      hash.map do |e|
        if e[field].respond_to? :zero?
          if e[field].zero?
            e[field] = nil
          end
        end
      end
    end
    # формирование списка перидов для графиков
    def correct_dates periods
      _ = periods.map { |period| period.period.getlocal.strftime("%Y-%m-%dT%H:%M:%S") }
      _.unshift "periods"
    end
    # посчитаем в процентах одно число от другого
    def this_is_n_percent_from_m current, original 
      current_relative = current.to_f / original.to_f
      float_value = current_relative.round(2)
      percent = (float_value * 100).round
    end

  end


  # получить статистику пинга для хоста или хостов /api/ping/1&2&3&4
  get "/api/ping/:hosts" do 
    @ids_string = params[:hosts].split(/&/)
    start_date, end_date = nil, nil
    # start_date = request.body.start_date if request.body.respond_to? :start_date
    #  end_date = request.body.end_date request.body.respond_to? :end_date
    hosts = Host.find @ids_string
    # Если нужен график за последние Х минут
    if start_date.nil? && end_date.nil?
      periods = Period.last(30)
      get_data_for_ping_chart periods
    # Если будут указана дата "с - по"
    else

    end
  end

  # получить статистику времени отклика
  get "/api/response_time/:ids" do
    @ids_string = params[:hosts].split(/&/)
    responses_stat = HostWithPort.find @ids_string
    periods = Period.last 30 
    period_ids = periods.pluck :id
  end

  # статистика пинга если заданы диапазоны
  post "/api/ping/:host" do 
    host_id = params[:host]
    start_date, end_date = request.body.start_date, request.body.end_date
    ppp start_date
    ppp end_date
    ppp host_id
  end

  # получить статистику для агентов за последние Х минут
  get "/api/agents/:agents" do
    answer = { }
    @ids_string = params[:agents].split(/&/)
    periods = Period.last(30)
    periods_ids = periods.map &:id
    #ppp periods_ids
    cpu_ram_data = CPURAMEntry.where(period_id: (periods_ids.first..periods_ids.last), host_with_port_id: (@ids_string))
    #ppp cpu_ram_data
    missed_periods = { }
    answer = { }
    # добиваем недостающие периоды
    @ids_string.each do |id|
      _ = cpu_ram_data.where(host_with_port_id: id).pluck :period_id
      diff = periods_ids - _
      if !diff.empty? 
        diff.each do |period_id|
          cpu_ram_data << CPURAMEntry.new(period_id: period_id, used_cpu: nil, used_ram: nil, used_swap: nil, host_with_port_id: id)
          missed_periods[id] ||= []
          missed_periods[id] << period_id
        end
      end
    end
    # список периодов
    normalized_periods = correct_dates periods
    # отсортируем по period_id
    cpu_ram_data = cpu_ram_data.sort_by { |e| e.period_id }
    # сгруппируем по id агента
    cpu_ram_data_grouped = cpu_ram_data.group_by { |e| e.host_with_port_id }
    # посчитаем интерфейсы
    # { "id_agent" => [[name_interface, 0,6,5,4,4,3], ['periods',....]] }
    interfaces_data = { }
    @ids_string.each do |id|
      interfaces = HostWithPort.where(id: id).first.interfaces
      interfaces_acc = []
      interfaces.each do |interface|
        interfaces_data[id] ||= []
        interface_stat = interface.interface_entries.where(period_id: (periods_ids.first..periods_ids.last))
        # добавим недостающие периоды для разрывов на графике
        if !missed_periods[id].nil?
          missed_periods[id].each do |missed|
            interface_stat << InterfaceEntry.new(period_id: missed, interface_id: interface.id, download: nil, upload: nil)
          end
        end
        interface_stat = interface_stat.sort_by { |e| e.period_id }
        download = interface_stat.map &:download
        upload = interface_stat.map &:upload
        avg_download = (download.compact.sum / download.count) 
        avg_upload = (upload.compact.sum / upload.count) 
        interfaces_acc << ["[DL] #{interface.name} [AVG #{avg_download} кб/c]"] + download 
        interfaces_acc << ["[UL] #{interface.name} [AVG #{avg_upload} кб/с]"] + upload 
      end
      interfaces_data[id] = interfaces_acc 
      interfaces_data[id] << normalized_periods 
    end
    # Оформим ответ для оперативной памяти и загрузки ЦПУ, разделы..
    cpu_ram_data_grouped.each do |k, v|
      answer[k] ||= {}
      answer[k]["cpu_load"] ||= []
      answer[k]["used_ram"] ||= []
      answer[k]["used_swap"] ||= []
      answer[k]["partitions"] ||= [] # заодно и разделы
      answer[k]["memory_max"] = RAM.where(host_with_port_id: k).first.total_ram
      answer[k]["swap_max"] = RAM.where(host_with_port_id: k).first.total_swap
      answer[k]["interfaces_data"] ||= []
      tmp_cpu = [""]
      tmp_mem = [""]
      tmp_swap = [""]
      v.each do |e|
        tmp_cpu << e.used_cpu
        tmp_mem << e.used_ram
        tmp_swap << e.used_swap
      end
      # информативные подписи
      tmp_cpu[0] = "Загрузка ЦП % [AVG #{ get_average_from tmp_cpu } %]"
      tmp_mem[0] = "Занято ОЗУ [AVG #{ get_average_from tmp_mem } МБ]"
      tmp_swap[0] = "Swap [AVG #{ get_average_from tmp_swap } МБ]"

      # разделы
      partitions = HostWithPort.where(id: k).first.partitions
      partitions.each do |partition|
        tmp_partitions = { }
        tmp_partitions["letter"] = partition.letter
        tmp_partitions["total_space"] = partition.total_space
        tmp_partitions["used_space"] = Partition.where(id: partition.id).first.partition_entries.last.size
        tmp_partitions["usage_percent"] = this_is_n_percent_from_m tmp_partitions["used_space"], tmp_partitions["total_space"]
        answer[k]["partitions"] << tmp_partitions
      end
      answer[k]["cpu_load"] << tmp_cpu
      answer[k]["used_ram"] << tmp_mem
      answer[k]["cpu_load"] << normalized_periods
      answer[k]["used_ram"] << normalized_periods
      answer[k]["used_swap"] << tmp_swap
      answer[k]["used_swap"] << normalized_periods
      answer[k]["interfaces_data"] = interfaces_data[k.to_s]
    end
    answer.to_json
  end

  # главная страница
  get '/' do
    File.open("./public/html/index.html").read
  end

  # Страница с конфигурацией
  get '/config' do
    config = Configuration.first
    config.to_json
  end 
  
  # сохранение конфигурации
  post '/config' do
    new_config = JSON.parse request.body.read
    config = Configuration.first
    new_config.each { |k, v| config[k] = v }
    config.save
  end

  # получить данные из таблиц
  get "/api/table/:table_name" do
    table = get_class_from_string params[:table_name]
    table.all.to_json
  end

  # внести изменения в запись в таблице
  post "/api/table/:table_name/:id" do
    new_data = JSON.parse request.body.read
    id = params[:id].to_i
    fields = []
    table = get_class_from_string params[:table_name]
    record = table.where(id: id).first
    fields << "id"
    # обновляем каждое значение
    new_data.each do |k, v|
      unless fields.any? {|name| name == k}
        record[k] = v 
      end
    end
    record.save!
  end

  # добавить новую запись в таблицу
  post "/api/table/:table_name" do
    table = get_class_from_string params[:table_name]
    data = JSON.parse request.body.read
    record = table.new(data)
    record.save
  end

  # удалить запись
  delete "/api/table/:table_name/:id" do
    ppp params[:table_name]
    ppp params[:id]
    table = get_class_from_string params[:table_name]
    table.destroy params[:id]
  end

  # вернуть последнюю запись
  get "/api/table/last/:table_name" do
    table = get_class_from_string params[:table_name]
    table.last.to_json
  end

  get '/api/get_agents_ids' do 
    HostWithPort.where(type_id: 3).to_json
  end

  ###########

  get '/api/hot' do 
    "30"
  end

  get '/api/status/db' do 
    ActiveRecord::Base.connected?.to_s
  end

  get '/api/status/service' do
    result = "false"
    if IO.popen(["systemctl", "status", "mariadb"]).read.split(" ")[10] == "active"
      result = "true"
    end
    result
  end

  # получить информацию об отклике от сетевых ресурсов за Х минут
  get "/api/get_response_statistics" do
    periods = Period.last @config.hot_minutes
    
  end

  # каждый запрос закрывает соединение с БД
  after do
    ActiveRecord::Base.connection.close
  end

end
