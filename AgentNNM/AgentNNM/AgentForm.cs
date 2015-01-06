using System;
using System.Collections.Concurrent;
using System.Net.Mail;
using System.ServiceProcess;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Net;
using Newtonsoft.Json;
using System.Net.NetworkInformation;
using System.IO;
using System.Diagnostics;
using System.Threading;

namespace AgentNonameNetworkMonitor
{
    public partial class AgentForm : Form
    {
        public static Config config = InitializeConfig();
        public AgentNNMServer server = new AgentNNMServer();
        private Thread _pingThread = new Thread(pingHosts) { IsBackground = true};
        private Thread _sendMessages = new Thread(_sendMail) {IsBackground = true};
        private Thread _checkWebThread = new Thread(webPagesCheck) { IsBackground = true };
        private static Dictionary<string,bool> _hostsAvailabilityCounter = new Dictionary<string, bool>();
        private static Dictionary<string, int> _webPagesSizes = new Dictionary<string, int>(); 
        private ContextMenu menuTray;
        private static AgentData agentData = new AgentData();
        private static ConcurrentQueue<string> _messagesQueue = new ConcurrentQueue<string>(); 

        public AgentForm()
        {
            InitializeComponent();
            FillFormConfig(config);
            TrayInit();
        }
        // Преобразовать строку в список строк
        private List<string> toListFromString(string s)
        {
            if (s.Length != 0)
            {
                return new List<string>(s.Split(',').ToArray());
            }
            else
            {
                return new List<string>{""};
            }
        }
        // сохранить изменения в конфиге
        private void saveButton_Click(object sender, EventArgs e)
        {
            var checkedServices = servicesCheckedListBox.CheckedItems;
            var checkedServicesList = new List<string>();
            foreach (var checkedService in checkedServices)
            {
                if (!checkedServicesList.Contains(checkedService.ToString().Split(',')[0]))
                {
                    checkedServicesList.Add(checkedService.ToString().Split(',')[0]);
                }
            }
            var tempConfig = new Config
            {
                Port = Convert.ToInt32(portTextBox.Text),
                interfaceString = interfaceTextBox.Text,
                ignoring_name_interfaces = toListFromString(ignoreInterfacesTextBox.Text),
                services = checkedServicesList,
                PerformPingAndNotify = PerformPingNotifyCheckBox.Checked,
                SmtpServer = SmtpServerTextbox.Text,
                SmtpPort = Convert.ToInt32(SmtpPortTextbox.Text),
                SmtpSsl = SslCheckbox.Checked,
                Login = LoginTextBox.Text,
                Password = PasswordTextBox.Text,
                IntervalOfPing = Convert.ToInt32(IntervalTextBox.Text),
                Hosts = toListFromString(HostsTextbox.Text),
                Subscribers = toListFromString(SubscribersTextBox.Text),
                PerformWebCheck = WebCheckBox.Checked,
                ListOfPagesForWebCheck = toListFromString(WebCheckListTextBox.Text),
                ThoughtfulPing = HardcoreCheckBox.Checked
            };
            string jsonConfig = JsonConvert.SerializeObject(tempConfig, Formatting.Indented);
            File.WriteAllText(@"config.json", jsonConfig);
            InitializeConfig();
            FillFormConfig(tempConfig);
            config = tempConfig;
        }
        // Функция возвращающая нормальный объем в мегабайтах
        public static ulong sizeInMb(ulong size)
        {
            var amountMb = ((size / 1024) / 1024);
            return amountMb;
        }
        // размер в гигабайтах
        public static long sizeInGB(long size)
        {
            return (((size / 1024) / 1024) / 1024);
        }
        //Определяем загрузку процессора
        public static int getCpuLoad()
        {
            PerformanceCounter cpuLoad = new PerformanceCounter("Processor", "% Processor Time", "_Total", true);
            cpuLoad.NextValue();
            sleep(1000);
            var __cpuload = (int) cpuLoad.NextValue();
            return __cpuload;
        }
        public static void sleep(int msec)
        {
            Thread.Sleep(msec);
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
        // Сбор всех данных
        public static string CollectData()
        {
            // Объект, который содержит всю информацию о системе
            getCpuLoadStat();
            // загрузка процессора и количество оперативной памяти
            Parallel.Invoke(() => getMemStat(), () => getHostName(), () => getNetworkStat(), () => getDrivesInfo(),  () => getServicesStatuses());
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
            agentData.Ram = new Ram { UsedRam = (int)sizeInMb(memInf.TotalPhysicalMemory - memInf.AvailablePhysicalMemory), TotalRam = (int)sizeInMb(memInf.TotalPhysicalMemory) };
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
                    sleep(1000); // чтобы вычислить сколько за секунду
                    var receivedEndTrafCount = (int)ni.GetIPv4Statistics().BytesReceived;
                    var totalReceived = ((receivedEndTrafCount - receivedBeginTrafCount) / 1024);
                    var sentEndTrafCount = (int)ni.GetIPv4Statistics().BytesSent;
                    var totalSent = ((sentEndTrafCount - sentBeginTrafCount) / 1024);
                    // Добавляем в общий хэш скорость в мегабитах в секунду
                    agentData.Interfaces.Add(new Interface { Name = ni.Name, Guid = ni.Id, DownloadSpeed = totalReceived * 8, UploadSpeed = totalSent * 8 });
                }
            });
        }
        // Информация о жестких дисках
        private static void getDrivesInfo()
        {
            agentData.Disks = new List<Disk>();
            foreach (var di in DriveInfo.GetDrives())
            {
                if (di.DriveType.ToString() == "Fixed")
                {
                    agentData.Disks.Add(new Disk { Name = di.Name, TotalSpace = sizeInGB(di.TotalSize), UsedSpace = sizeInGB(di.TotalSize - di.TotalFreeSpace) });
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
                catch {}
            });
        }
        // небольшой HTTP сервер
        public class AgentNNMServer
        {
            public int Port;
            public string interfaceString;
            public bool isListening = false;
            private HttpListener server = new HttpListener();
            private HttpListenerContext context;
            private dynamic response;
            private Thread bgThread;

            public void StartListen()
            {
                bgThread = new Thread(Start) { IsBackground = true, Name = "Agent publish json data" };
                bgThread.Start();
            }

            private void Start()
            {
                server.IgnoreWriteExceptions = true;
                server.Prefixes.Add(String.Format("http://{0}:{1}/", interfaceString, Port));
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
            public void StopListen()
            {
                if (isListening)
                {
                    isListening = false;
                    bgThread.Abort();
                    server.Stop();
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
        // Заполнение формы конфига
        public void FillFormConfig(Config _config)
        {
            // на всякий случай, если конфига.джсон файла нет, или он неверно заполнен
            try
            {
                portTextBox.Text = _config.Port.ToString();
                interfaceTextBox.Text = _config.interfaceString;
                ignoreInterfacesTextBox.Text = String.Join(",", _config.ignoring_name_interfaces);
                // получаем доступные сервисы в системе
                servicesCheckedListBox.Items.Clear();
                servicesCheckedListBox.CheckOnClick = true;
                var services = ServiceController.GetServices();
                foreach (var service in services)
                {
                    servicesCheckedListBox.Items.Add(service.ServiceName + ", " + service.DisplayName);
                }
                // поставить галочки над теми сервисами, что выбраны
                var rangeOfServicesIndeces = Enumerable.Range(0, servicesCheckedListBox.Items.Count - 1);
                foreach (var service in _config.services)
                {
                    foreach (var i in rangeOfServicesIndeces)
                    {
                        var _ = servicesCheckedListBox.Items[i].ToString().Split(',')[0];
                        if (service == _)
                        {
                            servicesCheckedListBox.SetItemChecked(i, true);
                        }
                    }
                }
                // про пинг и уведомления
                PerformPingNotifyCheckBox.Checked = _config.PerformPingAndNotify;
                SmtpServerTextbox.Text = _config.SmtpServer;
                SmtpPortTextbox.Text = _config.SmtpPort.ToString();
                SslCheckbox.Checked = _config.SmtpSsl;
                LoginTextBox.Text = _config.Login;
                PasswordTextBox.Text = _config.Password;
                IntervalTextBox.Text = _config.IntervalOfPing.ToString();
                HostsTextbox.Text = String.Join(",", _config.Hosts);
                SubscribersTextBox.Text = String.Join(",", _config.Subscribers);
                HardcoreCheckBox.Checked = config.ThoughtfulPing;
                // заполнить счетчик с хостами
                _hostsAvailabilityCounter.Clear();
                _webPagesSizes.Clear();
                _config.Hosts.ForEach(_ => _hostsAvailabilityCounter.Add(_, true));
                if (_config.ListOfPagesForWebCheck != null)
                {
                    _config.ListOfPagesForWebCheck.ForEach(_ => _webPagesSizes.Add(_, 0));
                    WebCheckListTextBox.Text = String.Join(",", _config.ListOfPagesForWebCheck);
                }
                WebCheckBox.Checked = _config.PerformWebCheck;
            }
            catch (Exception x)
            {
                MessageBox.Show("Файла config.json не существует либо он неверно оформлен " + x);
            }
        }
        // Запустить или остановить сервер
        private void startStopServerButton_Click(object sender, EventArgs e)
        {
            if (server.isListening)
            {
                try
                {
                    server.StopListen();
                    statusLabel.Text = "Сервер остановлен";
                    sleep(500);
                    trayIco.ShowBalloonTip(5000, "Остановка...", statusLabel.Text, ToolTipIcon.Info);
                    // старт пинга и сообщений отправка, если включены
                    if (config.PerformPingAndNotify)
                    {
                        _pingThread.Abort();
                        _sendMessages.Abort();
                        if (config.PerformWebCheck) _checkWebThread.Abort();                  
                    }
                }
                catch { }
            }
            else
            {
                try
                {
                    server.Port = config.Port;
                    server.interfaceString = config.interfaceString;
                    statusLabel.Text = String.Format("Сервер запущен на {0} порте", config.Port);
                    server.StartListen();
                    sleep(500);
                    trayIco.ShowBalloonTip(5000, "Запуск", statusLabel.Text, ToolTipIcon.Info);
                    if (config.PerformPingAndNotify)
                    {
                        _pingThread.Start();
                        sleep(config.IntervalOfPing);
                        _sendMessages.Start();
                        if (config.PerformWebCheck) _checkWebThread.Start();                     
                    }
                }
                catch { }
            }
        }
        // Иницилизация трея
        private void TrayInit()
        {
            trayIco = new NotifyIcon();
            trayIco.Text = "Agent Noname Network Monitor";
            trayIco.Icon = Properties.Resources.tray;
            menuTray = new ContextMenu();
            menuTray.MenuItems.Add("Выйти", OnExit);
            menuTray.MenuItems.Add("Развернуть", ShowForm);
            menuTray.MenuItems[1].Visible = false;
            trayIco.ContextMenu = menuTray;
            trayIco.Visible = true;
        }
        // При выходе
        private void OnExit(object sender, EventArgs e)
        {
            Application.Exit();
        }
        // Свернуть форму в трей
        private void MiacAgentForm_Resize(object sender, EventArgs e)
        {
            if (WindowState == FormWindowState.Minimized)
            {
                Hide();
                trayIco.ShowBalloonTip(5000, "Сворачиваемся", "Для открытия формы в контекстном меню выберите Развернуть", ToolTipIcon.Info);
                menuTray.MenuItems[1].Visible = true;
            }
        }
        // Развернуть форму из трея при 2 щелчке по иконке
        private void ShowForm(object sender, EventArgs e)
        {
            Show();
            WindowState = FormWindowState.Normal;
            menuTray.MenuItems[1].Visible = false;
        }
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

        private void MiacAgentForm_Load(object sender, EventArgs e)
        {
            trayIco.DoubleClick += trayIco_DoubleClick;
        }
        // при двойном клике на иконку в трее
        private void trayIco_DoubleClick(object Sender, EventArgs e)
        {
            Show();
            WindowState = FormWindowState.Normal;
        }

        // добавление сообщения в очередь и отправка
        private static void _sendMail()
        {
            string result;
            do
            {
                if (_messagesQueue.TryDequeue(out result))
                {
                    SendMail(result, config);
                }
                Thread.Sleep(1000);
            } while (true);
        }
        // Отправка письма на email c темой - http://stud-work.ru/index.php/c-sharp-mail-send-prostoj-primer-c-otpravka-email
        private static bool SendMail(string caption, Config _config)
        {
            var mail = new MailMessage();
            var client = new SmtpClient
            {
                Host = _config.SmtpServer,
                Port = _config.SmtpPort,
                EnableSsl = _config.SmtpSsl,
                Credentials = new NetworkCredential(_config.Login.Split('@')[0], _config.Password),
                DeliveryMethod = SmtpDeliveryMethod.Network
            };
            client.ServicePoint.MaxIdleTime = 1;
            client.ServicePoint.ConnectionLimit = 100;
            try
            {
                mail.From = new MailAddress(_config.Login);
                // Добавляем в список адресатов всех подписчиков
                _config.Subscribers.ForEach(subscriber => mail.To.Add(new MailAddress(subscriber)));
                mail.Subject = caption;
                client.Send(mail);
                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }
        // пинг
        private static bool _ping(string host)
        {
            sleep(100);
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
                sleep(config.IntervalOfPing * 1000);
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
                sleep(config.IntervalOfPing * 1000);
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
