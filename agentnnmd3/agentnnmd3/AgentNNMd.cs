using System;
using System.ServiceProcess;
using System.Collections.Generic;
using System.Text;
using System.Net;
using Newtonsoft.Json;
using System.Net.NetworkInformation;
using System.IO;
using System.Diagnostics;
using System.Threading;

namespace agentnnmd3
{
    class AgentNNMd
    {
        private static Config config = InitializeConfig();
        private static AgentData agentData = new AgentData();
        private const int MEGABYTE = 1024 * 1024;
        private const int GYGABYTE = 1024 * 1024 * 1024;
        static void Main(string[] args)
        {
            Server.StartListen();
            Console.ReadLine();
        }

        // небольшой HTTP сервер
        public static class Server
        {
            private static int Port;
            private static string interfaceString;
            private static bool isListening = false;
            private static HttpListener server = new HttpListener();
            private static HttpListenerContext context;
            private static string response;
            private static Thread bgThread;

            public static void StartListen()
            {
                bgThread = new Thread(Start);
                bgThread.IsBackground = true;
                bgThread.Name = "Agent publish json data";
                bgThread.Start();
            }

            private static void Start()
            {
                server.IgnoreWriteExceptions = true;
                server.Prefixes.Add(String.Format("http://{0}:{1}/", config.interfaceString, config.Port));
                server.Start();
                isListening = true;
                while (isListening)
                {
                    context = server.GetContext();
                    response = CollectData();
                    context.Response.ContentLength64 = Encoding.UTF8.GetByteCount(response);
                    context.Response.StatusCode = (int)HttpStatusCode.OK;
                    context.Response.ContentEncoding = Encoding.UTF8;
                    using (var s = context.Response.OutputStream)
                    using (var sw = new StreamWriter(s))
                        sw.Write(response);
                }
            }
        }
        // Инициализация конфигурации
        public static Config InitializeConfig()
        {
            var stream = File.OpenText(@"config.json");
            var configRaw = stream.ReadToEnd();
            stream.Close();
            return JsonConvert.DeserializeObject<Config>(configRaw);
        }
        // Сбор всех данных
        public static string CollectData()
        {
            // Объект, который содержит всю информацию о системе
            getCpuLoadStat();
            // загрузка процессора и количество оперативной памяти
            var GetCpuStatThread = new Thread(getMemStat) { IsBackground = true };
            var GetHostNameThread = new Thread(getHostName) { IsBackground = true };
            var GetDrivesInfo = new Thread(getDrivesInfo) { IsBackground = true };
            var GetServicesStatuses = new Thread(getServicesStatuses) { IsBackground = true };
            var GetNetworkStat = new Thread(getNetworkStat) { IsBackground = true };
            var Threads = new List<Thread>
            {
                GetCpuStatThread,
                GetHostNameThread,
                GetDrivesInfo,
                GetServicesStatuses,
                GetNetworkStat
            };
            Threads.ForEach(t => t.Start());
            Threads.ForEach(t => t.Join());
            var json = JsonConvert.SerializeObject(agentData);
            return json;
        }
        // получить загрузку процессора
        private static void getCpuLoadStat()
        {
            agentData.CpuLoad = getCpuLoad();
        }
        // получить информацию о свободной оперативной памяти
        private static void getMemStat()
        {
            var memInf = new Microsoft.VisualBasic.Devices.ComputerInfo();
            agentData.Ram = new Ram { UsedRam = (int) ((memInf.TotalPhysicalMemory - memInf.AvailablePhysicalMemory) / MEGABYTE), TotalRam = (int)(memInf.TotalPhysicalMemory / MEGABYTE) };
        }
        // получить имя хоста
        private static void getHostName()
        {
            agentData.Hostname = Environment.MachineName;
        }
        //Определяем загрузку процессора
        public static int getCpuLoad()
        {
            PerformanceCounter cpuLoad = new PerformanceCounter("Processor", "% Processor Time", "_Total", true);
            cpuLoad.NextValue();
            Thread.Sleep(1000);
            var __cpuload = (int)cpuLoad.NextValue();
            return __cpuload;
        }
        // получить статистику о сетевых интерфейсах
        private static void getNetworkStat()
        {
            agentData.Interfaces = new List<Interface>();
            var nics = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var ni in nics)
            {
                var isCorrect = true;
                // не брать стастистику с интерфейсов, которые стоят в списке для игнора
                foreach (var _int in config.ignoring_name_interfaces)
                {
                    if (ni.Name.IndexOf(_int, StringComparison.Ordinal) != -1)
                    {
                        isCorrect = false;
                    }
                }
                if (isCorrect)
                {
                    var receivedBeginTrafCount = (int)ni.GetIPv4Statistics().BytesReceived;
                    var sentBeginTrafCount = (int)ni.GetIPv4Statistics().BytesSent;
                    Thread.Sleep(1000); // чтобы вычислить сколько за секунду
                    var receivedEndTrafCount = (int)ni.GetIPv4Statistics().BytesReceived;
                    var totalReceived = ((receivedEndTrafCount - receivedBeginTrafCount) / 1024);
                    var sentEndTrafCount = (int)ni.GetIPv4Statistics().BytesSent;
                    var totalSent = ((sentEndTrafCount - sentBeginTrafCount) / 1024);
                    // Добавляем в общий хэш скорость в мегабитах в секунду
                    agentData.Interfaces.Add(new Interface { Name = ni.Name, Guid = ni.Id, DownloadSpeed = totalReceived * 8, UploadSpeed = totalSent * 8 });
                }
            }
        }
        // Информация о жестких дисках
        private static void getDrivesInfo()
        {
            agentData.Disks = new List<Disk>();
            foreach (var di in DriveInfo.GetDrives())
            {
                if (di.DriveType.ToString() == "Fixed")
                {
                    agentData.Disks.Add(new Disk { Name = di.Name, TotalSpace = (di.TotalSize / GYGABYTE), UsedSpace = ((di.TotalSize - di.TotalFreeSpace) / GYGABYTE) });
                }
            }
        }
        // получить информацию о сервисах
        private static void getServicesStatuses()
        {
            agentData.Services = new List<Service>();
            config.services.ForEach(s =>
            {
                try
                {
                    var service = new ServiceController(s);
                    var worked = service.Status.ToString() == "Running";
                    agentData.Services.Add(new Service { Name = s, Working = worked });
                }
                catch { }
            });
        }
    }
}
