# encoding: utf-8

class Type < ActiveRecord::Base
  validates :name, presence: true, uniqueness: true
end

class Host < ActiveRecord::Base
  belongs_to :group
  has_many :host_with_port, dependent: :destroy
  has_many :ping_entries, dependent: :destroy
  validates :name, presence: true, uniqueness: true
  validates :address, presence: true, uniqueness: true
  validates :group_id, presence: true
end

class Group < ActiveRecord::Base
  has_many :hosts, dependent: :destroy
end

class HostWithPort < ActiveRecord::Base
  belongs_to :host
  has_many :page_entries, dependent: :destroy
  has_many :partitions, dependent: :destroy
  has_many :interfaces, dependent: :destroy
  self.table_name = "hosts_with_ports"
end

class Service < ActiveRecord::Base
  validates :system_name, presence: true, uniqueness: true
  validates :readable_name, presence: true
end

class Period < ActiveRecord::Base
end

class Subscriber < ActiveRecord::Base
end

class Partition < ActiveRecord::Base
  validates :letter, presence: true
  validates :total_space, presence: true
  validates :host_with_port_id, presence: true
  belongs_to :host_with_port
  has_many :partition_entries, dependent: :destroy
end

class PortEntry < ActiveRecord::Base
  self.table_name = "port_statistics"
  validates :host_with_port_id, presence: true
  validates :period_id, presence: true
end

class PageEntry < ActiveRecord::Base
  self.table_name = "page_statistics"
  belongs_to :host_with_port
end

class CPURAMEntry < ActiveRecord::Base
  self.table_name = "cpu_ram_statistics"
end

class Interface < ActiveRecord::Base
  validates :name, presence: true
  validates :guid, presence: true, uniqueness: true
  validates :host_with_port_id, presence: true
  has_many :interface_entries, dependent: :destroy
  belongs_to :host_with_port
end

class InterfaceEntry < ActiveRecord::Base
  self.table_name = "interfaces_statistics"
  validates :host_with_port_id, presence: true
  validates :interface_id, presence: true
  validates :upload, presence: true
  validates :download, presence: true
  validates :period_id, presence: true
  belongs_to :interface
end

class PingEntry < ActiveRecord::Base
  self.table_name = "ping_statistics"
  # validates :latency, presense: true
  # validates :period_id, presence: true
  # valudates :host_id, presence: true
end



class ServiceEntry < ActiveRecord::Base
  self.table_name = "services_statistics"
  validates :service_id, presence: true
  validates :period_id, presence: true
  validates :host_with_port_id, presence: true
end

class PartitionEntry < ActiveRecord::Base
  self.table_name = "partitions_statistics"
  validates :partition_id, presence: true
  validates :period_id, presence: true
  validates :host_with_port_id, presence: true
  validates :size, presence: true
  belongs_to :partition
end

class Configuration < ActiveRecord::Base
  self.table_name = "configuration"
end

class RAM < ActiveRecord::Base
  self.table_name = "system_memory"
end

