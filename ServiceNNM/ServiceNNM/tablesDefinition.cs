using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// Описание структуры таблиц

namespace NonameNetworkMonitor
{
    class Host
    {
        public int id;
        public string name;
        public string ip_or_name;
        public int group_id;
        // для удобства
        public long latency;
    }

    class HostAndPort
    {
        public int id;
        public int host_id;
        public int port;
        public string name;
        public int type_of_host_and_port_id;
        public string route;
        // эти поля для удобства
        public string domainNameIp;
        public int size;
        public int isAlive;
    }
    // класс формата данных интерфейсов из таблицы
    class InterfaceT
    {
        public int id { get; set; }
        public string name { get; set; }
        public string guid { get; set; }
        public int host_and_port_agent_id { get; set; }
    }
    // Класс формата данных жестких дисков из таблицу hdd_partitions
    class HddPartitionsT
    {
        public int id { get; set; }
        public int host_and_port_agent_id { get; set; }
        public string partition_letter { get; set; }
        public int total_space { get; set; }
    }
    // класс для сервиса
    class ServiceT
    {
        public int id { get; set; }
        public string name { get; set; }
        public string readable_name { get; set; }
    }
    // класс для размера веб-страниц
    class WebPageSizeJournalT
    {
        public int id { get; set; }
        public int host_and_port_id { get; set; }
        public int size { get; set; }
        public int period_id { get; set; }
    }
}
