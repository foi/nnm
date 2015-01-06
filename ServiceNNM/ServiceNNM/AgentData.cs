using System.Collections.Generic;
using System.Collections.Specialized;

namespace NonameNetworkMonitor
{
    // класс формата данных ответа Агента
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
        public int host_and_port_agent_id { get; set; }
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
        public string readable_name { get; set; }
    }
}
