using System;
using System.ServiceProcess;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Forms;
using Newtonsoft.Json;
using System.IO;

namespace agentconfig
{
    public partial class AgentForm : Form
    {
        public static Config config = InitializeConfig();
        private ContextMenu menuTray;

        public AgentForm()
        {
            InitializeComponent();
            FillFormConfig(config);
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
        
        // При выходе
        private void OnExit(object sender, EventArgs e)
        {
            Application.Exit();
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
    }
}
