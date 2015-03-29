using System.Collections.Generic;

namespace agentnnmd3
{
    // Классы для сериализации
    public class Ram
    {
        public int TotalRam { get; set; }
        public int UsedRam { get; set; }
    }

    public class Disk
    {
        public string Name { get; set; }
        public long TotalSpace { get; set; }
        public long UsedSpace { get; set; }
    }

    public class Interface
    {
        public string Name { get; set; }
        public int UploadSpeed { get; set; }
        public int DownloadSpeed { get; set; }
        public string Guid { get; set; }
    }

    public class AgentData
    {
        public string Hostname { get; set; }
        public int CpuLoad { get; set; }
        public Ram Ram { get; set; }
        public List<Disk> Disks { get; set; }
        public List<Interface> Interfaces { get; set; }
        public List<Service> Services { get; set; }
    }
    public class Service
    {
        public string Name { get; set; }
        public bool Working { get; set; }
    }
    // Структура конфига
    public class Config
    {
        public Config()
        {
            Port = 9999;
            interfaceString = "*";
        }
        public string interfaceString { get; set; }
        public int Port { get; set; }
        public string[] ignoring_name_interfaces { get; set; }
        public List<string> services { get; set; }
    }
}
