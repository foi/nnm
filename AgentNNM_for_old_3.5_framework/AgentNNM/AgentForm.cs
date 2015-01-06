using System;
using System.ServiceProcess;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
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
        public TinyServer server = new TinyServer();
        private ContextMenu menuTray;
        private static AgentData agentData = new AgentData();

        public AgentForm()
        {
            InitializeComponent();
            FillFormConfig(config);
            TrayInit();
        }
        // Преобразовать строку в список строк
        private string[] toListFromString(string s)
        {
            return s.Split(',').ToArray();
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
                services = checkedServicesList
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
            public string[] ignoring_name_interfaces { get; set; }
            public List<string> services { get; set; }
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
                    sleep(1000); // чтобы вычислить сколько за секунду
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
        public class TinyServer
        {
            public int Port;
            public string interfaceString;
            public bool isListening = false;
            private HttpListener server = new HttpListener();
            private HttpListenerContext context;
            private string response;
            private Thread bgThread;

            public void StartListen()
            {
                bgThread = new Thread(new ThreadStart(Start));
                bgThread.IsBackground = true;
                bgThread.Name = "Agent publish json data";
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
                }
                catch { }
            }
        }
        // Иницилизация трея
        private void TrayInit()
        {
            trayIco = new NotifyIcon();
            trayIco.Text = "Agent Noname Network Monitor";
            trayIco.Icon = AgentNonameNetworkMonitor.Properties.Resources.tray;
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
        private void trayIco_DoubleClick(object Sender, EventArgs e)
        {
            Show();
            WindowState = FormWindowState.Normal;
        }
    }
}
