using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Net.NetworkInformation;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace agentnnmd
{
    // хттп сервер
    public static class AgentNNMServer
    {
        private static AgentData agentData = new AgentData();
        private static Config config = new Config();
        private static bool IsListening = false;
        private static HttpListener Server = new HttpListener();
        private static HttpListenerContext _context;
        private static string _response;
        private static Thread _bgThread;
        private const int MEGABYTE = 1024*1024;
        private const int GYGABYTE = 1024*1024*1024;
        private static ConcurrentQueue<string> _messagesQueue = new ConcurrentQueue<string>();
        private static Dictionary<string, bool> _hostsAvailabilityCounter = new Dictionary<string, bool>();
        private static Dictionary<string, int> _webPagesSizes = new Dictionary<string, int>();
        private static Thread _pingThread = new Thread(pingHosts) { IsBackground = true };
        private static Thread _sendMessages = new Thread(_sendMail) { IsBackground = true };
        private static Thread _checkWebThread = new Thread(webPagesCheck) { IsBackground = true };

        public static void StartListen()
        {
            config = InitializeConfig();
            // заполним дефолтные состояния
            config.Hosts.ForEach(_ => _hostsAvailabilityCounter.Add(_, true));
            if (config.ListOfPagesForWebCheck != null) config.ListOfPagesForWebCheck.ForEach(_ => _webPagesSizes.Add(_, 0));
            _bgThread = new Thread(Start) { IsBackground = true, Name = "Agent publish json data" };
            _bgThread.Start();
            if (config.PerformPingAndNotify)
            {
                _pingThread.Start();
                Thread.Sleep(config.IntervalOfPing);
                _sendMessages.Start();
                if (config.PerformWebCheck) _checkWebThread.Start();
            }
        }

        private static void Start()
        {
            Server.IgnoreWriteExceptions = true;
            Server.Prefixes.Add(String.Format("http://{0}:{1}/", config.interfaceString, config.Port));
            Server.Start();
            IsListening = true;
            while (IsListening)
            {
                _context = Server.GetContext();
                _response = CollectData();
                _context.Response.ContentLength64 = Encoding.UTF8.GetByteCount(_response);
                _context.Response.StatusCode = (int)HttpStatusCode.OK;
                _context.Response.ContentEncoding = Encoding.UTF8;
                using (var s = _context.Response.OutputStream)
                using (var sw = new StreamWriter(s))
                    sw.Write(_response);
            }
        }
        // Сбор всех данных
        public static string CollectData()
        {
            // Объект, который содержит всю информацию о системе
            GetCpuLoadStat();
            // загрузка процессора и количество оперативной памяти
            Parallel.Invoke(() => GetMemStat(), () => getHostName(), () => getNetworkStat(), () => getDrivesInfo(), () => getServicesStatuses());
            var json = JsonConvert.SerializeObject(agentData);
            return json;
        }
        private static int GetCpuLoad()
        {
            var cpuLoad = new PerformanceCounter("Processor", "% Processor Time", "_Total", true);
            cpuLoad.NextValue();
            Thread.Sleep(1000);
            var __cpuload = (int)cpuLoad.NextValue();
            return __cpuload;
        }
        // получить загрузку процессора
        private static void GetCpuLoadStat()
        {
            agentData.CpuLoad = GetCpuLoad();
        }
        // получить информацию о свободной оперативной памяти
        private static void GetMemStat()
        {
            var memInf = new Microsoft.VisualBasic.Devices.ComputerInfo();
            agentData.Ram = new Ram { UsedRam = (int)((memInf.TotalPhysicalMemory - memInf.AvailablePhysicalMemory) / MEGABYTE), TotalRam = (int)(memInf.TotalPhysicalMemory / MEGABYTE) };
        }
        // получить имя хоста
        private static void getHostName()
        {
            agentData.Hostname = Environment.MachineName;
        }
        // получить статистику о сетевых интерфейсах
        private static void getNetworkStat()
        {
            agentData.Interfaces = new List<Interface>();
            var nics = NetworkInterface.GetAllNetworkInterfaces();
            Parallel.ForEach(nics, ni =>
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
            });
        }
        // Инициализация конфигурации
        public static Config InitializeConfig()
        {
            var stream = File.OpenText(@"config.json");
            var configRaw = stream.ReadToEnd();
            stream.Close();
            return JsonConvert.DeserializeObject<Config>(configRaw);
        }
        // Информация о жестких дисках
        private static void getDrivesInfo()
        {
            agentData.Disks = new List<Disk>();
            foreach (var di in DriveInfo.GetDrives())
            {
                if (di.DriveType.ToString() == "Fixed")
                {
                    agentData.Disks.Add(new Disk { Name = di.Name, TotalSpace = ((int)((di.TotalSize) / GYGABYTE)), UsedSpace = (int)((di.TotalSize - di.TotalFreeSpace) / GYGABYTE) });
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
        // добавление сообщения в очередь и отправка
        private static void _sendMail()
        {
            string result;
            do
            {
                if (_messagesQueue.TryDequeue(out result))
                {
                    SendMail(result);
                }
                Thread.Sleep(1000);
            } while (true);
        }
        // Отправка письма на email c темой - http://stud-work.ru/index.php/c-sharp-mail-send-prostoj-primer-c-otpravka-email
        private static bool SendMail(string caption)
        {
            var mail = new MailMessage();
            var client = new SmtpClient
            {
                Host = config.SmtpServer,
                Port = config.SmtpPort,
                EnableSsl = config.SmtpSsl,
                Credentials = new NetworkCredential(config.Login.Split('@')[0], config.Password),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };
            client.ServicePoint.MaxIdleTime = 1;
            client.ServicePoint.ConnectionLimit = 100;
            try
            {
                mail.From = new MailAddress(config.Login);
                // Добавляем в список адресатов всех подписчиков
                config.Subscribers.ForEach(subscriber => mail.To.Add(new MailAddress(subscriber)));
                mail.Subject = caption;
                client.Send(mail);
                return true;
            }
            catch
            {
                return false;
            }
        }
        // пинг
        private static bool _ping(string host)
        {
            Thread.Sleep(100);
            try
            {
                var p = new Ping();
                PingReply pr = p.Send(host, 1000);
                return (pr.Status == IPStatus.Success);
            }
            catch
            {
                return false;
            }
        }
        // Пинг Хоста
        private static bool PingHost(string host)
        {
            if (config.ThoughtfulPing)
            {
                var first = _ping(host);
                if (first)
                {
                    return first;
                }
                else
                {
                    var second = _ping(host);
                    return second;
                }
            }
            else
            {
                return _ping(host);
            }
        }
        // пинг хостов
        private static void pingHosts()
        {
            do
            {
                config.Hosts.AsParallel().ForAll(_ =>
                {
                    var available = PingHost(_);
                    if (available != _hostsAvailabilityCounter[_])
                    {
                        _messagesQueue.Enqueue(string.Format("{0} - {1}. Сообщение от агента. {2}", _, available ? "доступен" : "недоступен", DateTime.Now.ToString()));
                        _hostsAvailabilityCounter[_] = available;
                    }
                });
                Thread.Sleep(config.IntervalOfPing * 1000);
            } while (config.PerformPingAndNotify);
        }
        // проверка размеров веб-страниц
        private static void webPagesCheck()
        {
            do
            {
                config.ListOfPagesForWebCheck.ForEach(p =>
                {
                    var size = _checkWebpage(p);
                    if (size != _webPagesSizes[p])
                    {
                        _messagesQueue.Enqueue(string.Format("Размер страницы {0} изменился с {1} на {2}. Сообщение от агента. {3}", p, _webPagesSizes[p], size, DateTime.Now.ToString()));
                        _webPagesSizes[p] = size;
                    }
                });
                Thread.Sleep(config.IntervalOfPing * 1000);
            } while (config.PerformPingAndNotify && config.PerformWebCheck);
        }

        private static int _checkWebpage(string route)
        {
            try
            {
                var webReq = WebRequest.Create(route);
                webReq.Timeout = 1000;
                var webResp = webReq.GetResponse();
                var stream = webResp.GetResponseStream();
                var reader = new StreamReader(stream);
                var response = reader.ReadToEnd();
                stream.Close();
                reader.Close();
                webReq.Abort();
                return Convert.ToInt32(response.Length);
            }
            catch
            {
                return 0;
            }
        }
    }
}
