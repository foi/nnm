require "./models"

class CreateDatabase < ActiveRecord::Migration
  def self.up
    create_table :groups do |t|
      t.string :name, limit: 50, null: false
    end

    create_table :hosts do |t|
      t.string :name, null: false, limit: 50
      t.string :address, null: false
      t.integer :group_id, null: false
      t.boolean :notify, default: true
    end

    create_table :subscribers do |t|
      t.string :email, limit: 50
    end

    create_table :periods do |t|
      t.datetime :period, null: false
    end

    create_table :services do |t|
      t.string :system_name, null: false
      t.string :readable_name, null: false
    end

    create_table :types do |t|
      t.string :name, null: false
    end

    create_table :partitions do |t|
      t.integer :host_with_port_id, null: false
      t.string :letter, null: false
      t.integer :total_space, null: false
    end

    create_table :hosts_with_ports do |t|
      t.integer :host_id, null: false
      t.integer :port, null: false
      t.string :name, null: false
      t.integer :type_id, null: false
      t.string :route
      t.boolean :notify, default: true
    end

    create_table :system_memory do |t|
      t.integer :host_with_port_id, null: false
      t.integer :total_ram, null: false
      t.integer :total_swap, null: false
    end

    create_table :partitions_statistics do |t|
      t.integer :partition_id, null: false
      t.integer :size, null: false
      t.integer :host_with_port_id, null: false
      t.integer :period_id, null: false
    end

    create_table :cpu_ram_statistics do |t|
      t.integer :used_cpu, null: false
      t.integer :used_ram, null: false
      t.integer :used_swap, null: false
      t.integer :host_with_port_id, null: false
      t.integer :period_id
    end

    create_table :interfaces do |t|
      t.string :name, null: false
      t.string :guid, null: false
      t.integer :host_with_port_id, null: false
    end

    create_table :interfaces_statistics do |t|
      t.integer :host_with_port_id, null: false
      t.integer :interface_id, null: false
      t.integer :upload, null: false
      t.integer :download, null: false
      t.integer :period_id, null: false 
    end

    create_table :port_statistics do |t|
      t.integer :period_id, null: false
      t.integer :host_with_port_id, null: false
      t.boolean :is_alive, null: false
    end

    create_table :ping_statistics do |t|
      t.integer :period_id, null: false
      t.integer :host_id, null: false
      t.integer :latency, null: false
    end

    create_table :services_statistics do |t|
      t.integer :host_with_port_id, null: false
      t.integer :period_id, null: false
      t.integer :service_id, null: false
      t.boolean :status, null: false
    end

    create_table :resource_statistics do |t|
      t.integer :host_with_port_id, null: false
      t.integer :size, null: false, default: 0
      t.integer :period_id, null: false
      t.integer :response_time, null: false, default: 0
    end

    create_table :configuration do |t|
      t.string :smtp_server, null: false
      t.integer :smtp_port, null: false
      t.boolean :smtp_secure, null: false
      t.string :smtp_email, null: false
      t.string :smtp_password, null: false
      t.boolean :smtp_notify, null: false
      t.integer :resource_timeout, null: false
      t.integer :ping_timeout, null: false
      t.integer :port_timeout, null: false
      t.integer :agent_timeout, null: false
      t.boolean :sleep, null: false
      t.float :sleep_min, null: false
      t.float :sleep_max, null: false
      t.integer :tries, null: false
      t.integer :response_time_avg_from, null: false
      t.integer :hot_minutes, null: false
      t.integer :notify_after_period_n, null: false
      t.string :notify_agent_template, null: false
      t.string :notify_port_template, null: false
      t.string :notify_host_template, null: false
      t.string :notify_resource_template, null: false
      t.string :notify_host_alive_template, null: false
      t.string :default_admin_name, null: false
      t.string :default_admin_password, null: false 
    end

    # создадим записи по умолчанию
    ["Локальная сеть", "Защищенная сеть", "Интернет"].each do |e|
      Group.create! name: e
    end

    ["Размер и время отклика ресурса", "Проверка порта", "Agent"].each do |e|
      Type.create! name: e
    end

    # Первоначальная конфигурация
    Configuration.create!( 
      smtp_server: "example.mail.ru", 
      smtp_port: 25, 
      smtp_secure: false, 
      smtp_email: "example@example.net", 
      smtp_password: "password", 
      smtp_notify: false, 
      resource_timeout: 2,
      ping_timeout: 1,
      port_timeout: 1,
      agent_timeout: 10,
      sleep: true,
      sleep_min: 0.001,
      sleep_max: 1,
      tries: 3,
      response_time_avg_from: 4,
      notify_after_period_n: 1,
      hot_minutes: 30,
      notify_agent_template: "[АГЕНТ] У {agent} сервис {service} изменил статус на {status}. Время события: {time}",
      notify_port_template: "[ПОРТ] {port_name} на {hostname} изменил статус на - {status}. Время события: {time}",
      notify_host_template: "[ПИНГ] {hostname} {status} в течение {fail_time}. Время события: {time}",
      notify_resource_template: "[RESOURCE] {resource} на {hostname} изменила размер на {size}. Время события: {time}",
      notify_host_alive_template: "[ПИНГ] {hostname} снова доступен. Время события: {time}",
      default_admin_name: "admin",
      default_admin_password: "admin"
      )

  end

  def self.down
    drop_table :groups
    drop_table :hosts
    drop_table :system_memory
    drop_table :subscribers
    drop_table :periods
    drop_table :configuration
    drop_table :resource_statistics
    drop_table :services_statistics
    drop_table :ping_statistics
    drop_table :port_statistics
    drop_table :interfaces_statistics
    drop_table :interfaces
    drop_table :hosts_with_ports
    drop_table :partitions_statistics
    drop_table :partitions
    drop_table :types
    drop_table :services
    drop_table :cpu_ram_statistics
  end
end