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

        public AgentForm()
        {
            InitializeComponent();
            FillFormConfig(config);
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
                if (_config.ListOfPagesForWebCheck != null)
                {
                    WebCheckListTextBox.Text = String.Join(",", _config.ListOfPagesForWebCheck);
                }
                WebCheckBox.Checked = _config.PerformWebCheck;
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
    }
}
