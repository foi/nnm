using System.Collections.Generic;

namespace agentnnmd
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
        public int TotalSpace { get; set; }
        public int UsedSpace { get; set; }
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
        public string interfaceString { get; set; }
        public int Port { get; set; }
        public List<string> ignoring_name_interfaces { get; set; }
        public List<string> services { get; set; }
        public bool PerformPingAndNotify { get; set; }
        public int IntervalOfPing { get; set; }
        public string SmtpServer { get; set; }
        public int SmtpPort { get; set; }
        public bool SmtpSsl { get; set; }
        public string Login { get; set; }
        public string Password { get; set; }
        public List<string> Hosts { get; set; }
        public List<string> Subscribers { get; set; }
        public bool PerformWebCheck { get; set; }
        public bool ThoughtfulPing { get; set; }
        public List<string> ListOfPagesForWebCheck { get; set; }
    }
}
