using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Threading;
using Newtonsoft.Json;
using System.Net.NetworkInformation;
using System.Net.Mail;

namespace NonameNetworkMonitor
{
    // объест этого класса будет собирать всю информацию
    class ServiceNonameNetworkMonitor
    {
        // Словарь доля подсчета отвеченных и неотвеченных хостов
        private static Dictionary<int, int> counter_avail_h = new Dictionary<int, int>();
        // Словарь для подсчета неотвеченных портов
        private static Dictionary<int, int> counter_avail_p = new Dictionary<int, int>(); 
        // счетчик для сервисов
        private static List<agentService> _counterServices = new List<agentService>();
        // Словарь восресших хостов после 1 периода смерти
        private static List<int> resurrectHosts = new List<int>(); 
        // словарь воскресших хостов
        private static List<int> resurrectPorts = new List<int>(); 
        // Подписчики
        private static List<string> subscribers = new List<string>();
        // для веб-страниц эталон, куда в случае изменения будут записываться изменения, а так же и в базу данных.
        private static List<WebPageSizeJournalT> journalWebPages = new List<WebPageSizeJournalT>();  
        // добавился/добавились ли новые объекты проверки для веб-страниц
        private static bool hasNewWebPages = true;
        // строка подключения к БД
        private static string connectionString; 
        private readonly Thread _thread = new Thread(Gather) { IsBackground = true };
        private readonly Thread _notifyThread = new Thread(notifyGenerator) { IsBackground = true};
        // поток для отправки сообщений
        private readonly Thread _sendMailThread = new Thread(_sendMail) { IsBackground = true };
        private static ConcurrentQueue<string> _mailQueue = new ConcurrentQueue<string>(); 
        private static bool _immediateStop = false;
        private const int Interval = 60;
        // стартовое время
        private static DateTime startTime;
        // отдельный коннекшн для отдельной задачи
        private static SqlConnection mainConnnection = new SqlConnection();
        private static SqlConnection notificationConnection = new SqlConnection();
        // Cписок коннекшнов, так будет проще запускать и останавливать
        private static List<SqlConnection> sqlConnections = new List<SqlConnection>()
        {
            mainConnnection,
            notificationConnection
        };
        private static int currentPeriodId;
        private static ExternalConfiguration externalConfiguration;
        // создаем списки для справочников
        private static List<Host> hosts = new List<Host>();
        
        private static List<Host> hosts_backup; 
        private static List<HostAndPort> hostsAndPorts = new List<HostAndPort>();
        // Только для проверки портов
        private static List<HostAndPort> forPortCheck = new List<HostAndPort>(); 
        private static List<HostAndPort> hostsAndPorts_backup;
        private static List<InterfaceT> interfacesFromTable = new List<InterfaceT>(); 
        private static List<ServiceT> services_backup = new List<ServiceT>(); 
        private static List<ServiceT> servicesFromTable = new List<ServiceT>(); 
        private static List<HostAndPort> hostsForWebCheck = new List<HostAndPort>();
        private static List<HostAndPort> hostsForWebCheck_backup = new List<HostAndPort>();
        private static List<AgentData> agentDatas = new List<AgentData>();
        private static Dictionary<int, int> memoryFromTable = new Dictionary<int, int>();
        private static List<HddPartitionsT> hddPartitionsFromTable = new List<HddPartitionsT>();
        // вставка интерфейсов
        private static SqlCommand insertInterfaces = new SqlCommand { Connection = mainConnnection }; // для вставки интерфейсов
        // для обновления имени интерфейса
        private static SqlCommand updateInterfaceName = new SqlCommand { Connection = mainConnnection };
        private static SqlCommand insertInterfacesStat = new SqlCommand { Connection = mainConnnection };
        // sql запрос про вставку количества оперативной памяти
        private static SqlCommand insertMemory = new SqlCommand { Connection = mainConnnection };
        // sql запрос про замену количества оперативной памяти
        private static SqlCommand UpdateMemory = new SqlCommand { Connection = mainConnnection };
        private static SqlCommand insertHddstatIntoJournal = new SqlCommand { Connection = mainConnnection };
        private static SqlCommand insertServicesQuery = new SqlCommand { Connection = mainConnnection };
        // идшники из таблицы агенты и периоды на текущий период
        private static List<int> idsAgentsAndCurrentPeriod = new List<int>();
        // вставить интерфейсы
        private static SqlCommand insertHddPartitions = new SqlCommand { Connection = mainConnnection };
        // id agent agentandperiodid на текущий период
        private static Dictionary<int, int> idsAgentsAndPeriodAndAgentsIdCurrentPeriod = new Dictionary<int, int>();
        // можно ли остановится?
        private static bool maybeStop;
        // http://stackoverflow.com/questions/560804/how-do-i-use-webrequest-to-access-an-ssl-encrypted-site-using-https
        public bool AcceptAllCertifications(object sender, System.Security.Cryptography.X509Certificates.X509Certificate certification, System.Security.Cryptography.X509Certificates.X509Chain chain, System.Net.Security.SslPolicyErrors sslPolicyErrors)
        {
            return true;
        }
        // Старт сбора
        public void Start()
        {
            // Культура одна
            Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
            try
            {
                // инициализировать конфиг
                initConfig();
                Console.WriteLine("config initialized");
                // патч для неподписанных сертификатов
                ServicePointManager.ServerCertificateValidationCallback = AcceptAllCertifications;
                // патч
                // открываем два коннекта для связи с БД
                connectionString = @externalConfiguration.connection_string;
                foreach (var sqlConnection in sqlConnections)
                {
                    sqlConnection.ConnectionString = @connectionString;
                    sqlConnection.Open();
                }
                _thread.Start();
                Thread.Sleep(Interval * 1000 - 10000);
                if (externalConfiguration.smtp.notification)
                {
                    // Стартуем поток со сбором об ошибках и запись их в лог несколько позже, потому что currentPeriodID может быть пуст
                    _notifyThread.Start();
                    // стартуем поток отправки сообщений
                    _sendMailThread.Start();
                }
                
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex);
            }
        }
        // Остановка сбора
        public void Stop()
        {
            _immediateStop = true;
            // Если запись в базу уже прошла, можно останавливаться сразу
            if (maybeStop)
            {
                Thread.Sleep(1);
            }
            else
            {
                Thread.Sleep((Interval / 6 ) * 1000);
            }
            foreach (var sqlConnection in sqlConnections){ sqlConnection.Close(); }
            _thread.Abort();
            if (externalConfiguration.smtp.notification)
            {
                _notifyThread.Abort();
                _sendMailThread.Abort();
            }
        }
        // Сам метод сбора
        private static void Gather()
        {
            do
            {
                // Сейчас можно остановится!
                maybeStop = true;
                // опустошаем списк с результами сбора прошлого периода
                clearTemporaryData();
                // Костыль, чтобы интервал был 60 секунд
                startTime = DateTime.UtcNow;
                // сначала создаем запись о периоде
                insertPeriod();
                // Прочитаем все, что нам нужно из справочников
                fillDictionaries();
                // Сбор отклика от хостов, проверка доступности портов, сбор информации от агентов и полученеи объема веб-страницы
                Parallel.Invoke(() => PingHosts(), () => CheckPorts(), () => GetFromAgents(), () => checkWeb());
                // Нельзя остановиться, запись в базу
                maybeStop = false;
                insertIntoJournals();
                // Во - теперь можно
                maybeStop = true;
                // Выше все, что должно произойти за заданный интервал
                var drawback = (int) (DateTime.UtcNow - startTime).TotalSeconds;
                var sleepTime = drawback > Interval ? 1 : (Interval - drawback) * 1000;
                Console.WriteLine(drawback);
                Thread.Sleep(sleepTime);
            } while (_immediateStop != true);
        }
        // созданеи записи о периоде в базе
        private static void insertPeriod()
        {
            var createPeriod = new SqlCommand
            {
                Connection = mainConnnection,
                CommandText = "INSERT INTO periods VALUES (@DATE)"
            };
            createPeriod.Parameters.AddWithValue("@DATE", startTime);
            createPeriod.ExecuteNonQuery();
            var findPeriodId = new SqlCommand { Connection = mainConnnection, CommandText = "SELECT * FROM periods WHERE ID = (SELECT MAX(ID) FROM periods)" };
            var readLastPeriodId = findPeriodId.ExecuteReader();
            while (readLastPeriodId.Read())
            {
                currentPeriodId = readLastPeriodId.GetInt32(0);
            }
            readLastPeriodId.Close();
        }
        // Запись в базу данных результатов выполнения сбора информации
        private static void insertIntoJournals()
        {
            // Список всех инсерт запросов
            var insertPingIntoJournal = new SqlCommand { Connection = mainConnnection };
            var insertCheckOfPortIntoJournal = new SqlCommand { Connection = mainConnnection };
            var insertWebPageSizeIntoJournal = new SqlCommand { Connection = mainConnnection };
            var insertAgentCpuMemData = new SqlCommand { Connection = mainConnnection }; // для вставки информации о загрузке цп и памяти
            var collectionInsertQueries = new List<SqlCommand> { insertPingIntoJournal, insertCheckOfPortIntoJournal, insertWebPageSizeIntoJournal, insertAgentCpuMemData, insertMemory, insertHddstatIntoJournal };
            var qPingString = "INSERT INTO journal_of_ping_hosts VALUES ";
            var qCheckPortsString = "INSERT INTO journal_of_check_ports VALUES ";
            var qWebPageCheckString = "INSERT INTO journal_of_web_page_check VALUES ";
            // строки запросов для агентов
            var qInsertCpuMemLoadString = "INSERT INTO agents_cpu_mem_load VALUES ";
            // Запись о пинге
            hosts.ForEach(host => qPingString += String.Format("({0},{1},{2}),", currentPeriodId, host.id, host.latency));
            insertPingIntoJournal.CommandText = removeLastComma(qPingString);
            // запись о проверке портов
            forPortCheck.ForEach(hp => qCheckPortsString += String.Format("({0},{1},{2}),", currentPeriodId, hp.id, hp.isAlive));
            insertCheckOfPortIntoJournal.CommandText = removeLastComma(qCheckPortsString);
            // запись данных в журнал о проверке веб-страниц
            //!! Добавить - если с прошлого раза размер не изменился то записи и вовсе не создается. - хуй забил
            //WebPageSizeAudit(qWebPageCheckString);
            hostsForWebCheck.ForEach(hostAndPort => qWebPageCheckString += String.Format("({0},{1},{2}),", hostAndPort.id, hostAndPort.size, currentPeriodId));
            insertWebPageSizeIntoJournal.CommandText = removeLastComma(qWebPageCheckString);
            
            // формат строки для агентов
            agentDatas.ForEach(agentData => qInsertCpuMemLoadString += String.Format("({0},{1},{2},{3}),", agentData.CpuLoad, agentData.Ram.UsedRam, agentData.host_and_port_agent_id, currentPeriodId));
            insertAgentCpuMemData.CommandText = removeLastComma(qInsertCpuMemLoadString);
            // вставка данных о интерфейсах, разделах, сервисах, а также статистики по ним
            if (agentDatas.Count != 0)
            {
                insertInterfacesIntoTable();
                insertPartitions();
                insertServices();
                insertStatusOfServicesIntoJournal();
                if (interfacesFromTable.Count != 0) insertInterfacesStatistics();
                if (hddPartitionsFromTable.Count != 0) insertStatHdd();
                insertMemoryOnOS();
            }
            // Запись в журнал статистику с интерфейсов
            BatchExecuteNonQuery(collectionInsertQueries);
        }
        // читаем информацию о размере веб-страниц, в случае если добавились новые проверки, тогда вставляем значения в базу, а если размер остался без изменений - ничего не делаем
        private static void WebPageSizeAudit(string queryString)
        {
            // инициализация эталонного листа
            if (hasNewWebPages)
            {
                // сначала найдем последний период, который есть в журнале
                var findLastPeriodId = new SqlCommand { Connection = mainConnnection, CommandText = "SELECT MAX(period_id) FROM journal_of_web_page_check)" };
                var pr = findLastPeriodId.ExecuteReader();
                while (pr.Read())
                {
                    // потом доделаю
                }

                var qReadLastWebPagesSizes = String.Format("SELECT * FROM journal_of_web_page_check WHERE period_id={0}",
                currentPeriodId - 1);
                var readWebPagesSizes = new SqlCommand {Connection = mainConnnection, CommandText = qReadLastWebPagesSizes};
                var r = readWebPagesSizes.ExecuteReader();
                while (r.Read())
                {
                    if (r.HasRows) 
                        journalWebPages.Add(new WebPageSizeJournalT{id = r.GetInt32(0), host_and_port_id = r.GetInt32(1), size = r.GetInt32(2), period_id = r.GetInt32(3)});
                }
                r.Close();
                hasNewWebPages = false;
            }
            hostsForWebCheck.ForEach(w =>
            {
                if (journalWebPages.Any(jw => jw.host_and_port_id == w.id))
                {
                    var _ = journalWebPages.First(jw => jw.host_and_port_id == w.id);
                    if (_.size != w.size)
                    {
                        _.size = w.size;
                        queryString += String.Format("({0},{1},{2}),", w.id, w.size, currentPeriodId);
                    }
                }
                else
                {
                    hasNewWebPages = true;
                }
            });
        }
        // получить id интерфейса зная его guid
        private static int getInterfaceIdFromGuid(string guid)
        {
            return interfacesFromTable.Find(x => x.guid == guid).id;
        }
        // вставить или заменить информацию об общем количестве оперативной памяти ОС
        private static void insertMemoryOnOS()
        {
            var qInsertMemory = "INSERT INTO memory VALUES ";
            var qReplaceMemory = "UPDATE memory SET memory_overall={0} WHERE host_and_port_agent_id={1}";
            if (memoryFromTable.Count == 0)
            {
                foreach (var agentData in agentDatas) qInsertMemory += String.Format("({0},{1}),", agentData.host_and_port_agent_id,
                        agentData.Ram.TotalRam);
                insertMemory.CommandText = qInsertMemory;
            }
            else
            {
                foreach (var agentData in agentDatas)
                {
                    var isExist = memoryFromTable.Any(x => x.Key == agentData.host_and_port_agent_id);
                    Console.WriteLine(isExist + " - " + agentData.host_and_port_agent_id + " - " + agentData.Hostname);
                    // Если объем памяти оперативки существует в базе, но он изменился
                    if (isExist)
                    {
                        var mem = memoryFromTable.First(x => x.Key == agentData.host_and_port_agent_id);
                        if (mem.Value != agentData.Ram.TotalRam)
                        {
                            var qReplaceMemoryFormatted = String.Format(qReplaceMemory, agentData.Ram.TotalRam,
                                agentData.host_and_port_agent_id);
                            UpdateMemory.CommandText = qReplaceMemoryFormatted;
                            UpdateMemory.ExecuteNonQuery();
                        }
                    }
                    // если нет данных о количестве оперативке в базе данных
                    else
                    {
                        qInsertMemory += String.Format("({0},{1}),", agentData.host_and_port_agent_id, agentData.Ram.TotalRam);
                    }
                }
                insertMemory.CommandText = qInsertMemory;
            }
        }
        // записать статистику с интерфейсов в базу данных
        private static void insertInterfacesStatistics()
        {
            var qInsertInterfacesStat = "INSERT INTO interfaces_stat_journal VALUES ";
            agentDatas.ForEach(agentData => agentData.Interfaces.ForEach(_int =>
            {
                if (_int != null)
                {
                    qInsertInterfacesStat += String.Format("({0},{1},{2},{3},{4}),", agentData.host_and_port_agent_id, getInterfaceIdFromGuid(_int.Guid), _int.UploadSpeed, _int.DownloadSpeed, currentPeriodId);
                }
            }));
            insertInterfacesStat.CommandText = removeLastComma(qInsertInterfacesStat);
            insertInterfacesStat.ExecuteNonQuery();
        }
        // добавить новые интерфейсы в базу данных
        private static void insertInterfacesIntoTable()
        {
            var qInsertInterface = "INSERT INTO interfaces VALUES ";
            var qUpdateInterfaceName = "UPDATE interfaces SET name='{0}' WHERE guid='{1}'";
            InterfaceT tmp = new InterfaceT();
            // Если первичная инициализация интерфейсов, когда таблица interfaces в базе данных пуста
            if (interfacesFromTable.Count == 0)
            {
                agentDatas.ForEach(agentData => agentData.Interfaces.ForEach(agentInt =>
                {
                    qInsertInterface += String.Format("('{0}','{1}',{2}),", agentInt.Name, agentInt.Guid,
                            agentData.host_and_port_agent_id);
                }));
                var qInsertInterfaceFormatted = removeLastComma(qInsertInterface);
                insertInterfaces.CommandText = qInsertInterfaceFormatted;
            }
            // Если в базе уже есть интерфейсы, появились новые интерфейсы
            else
            {
                agentDatas.ForEach(agentData => agentData.Interfaces.ForEach(_int =>
                {
                    if (_int != null)
                    {
                        var interfaceExist = interfacesFromTable.Any(x => x.guid == _int.Guid);
                        if (interfaceExist)
                        {
                            tmp = interfacesFromTable.First(x => x.guid == _int.Guid);
                        }
                        // если такого интерфейса нет, то - создать его
                        if (!interfaceExist)
                        {
                            qInsertInterface += String.Format("('{0}','{1}',{2}),", _int.Name, _int.Guid,
                            agentData.host_and_port_agent_id);
                            insertInterfaces.CommandText = qInsertInterface;
                        }
                        // если интерфес есть, но изменил имя
                        else
                        {
                            Console.WriteLine(tmp.name + " " + tmp.host_and_port_agent_id + "   " + _int.Name);
                            if (tmp.name != _int.Name)
                            {
                                var qUpdateInterfaceNameFormatted = String.Format(qUpdateInterfaceName, _int.Name,
                                    _int.Guid);
                                updateInterfaceName.CommandText = qUpdateInterfaceNameFormatted;
                                updateInterfaceName.ExecuteNonQuery();
                            }
                        }
                    }
                }));
            }
            if (insertInterfaces.CommandText.Length != 0)
            {
                insertInterfaces.CommandText = removeLastComma(insertInterfaces.CommandText);
                insertInterfaces.ExecuteNonQuery();
                insertInterfaces.CommandText = "";
                readInterfacesFromTable();
            }
        }
        // встака статистик по занятому пространству на разделах жестких дисков
        private static void insertStatHdd()
        {
            var qInsertHddPartitionStat = "INSERT INTO hdd_stat_journal VALUES ";
            foreach (var agentData in agentDatas)
            {
                foreach (var disk in agentData.Disks)
                {
                    qInsertHddPartitionStat += String.Format("({0},{1},{2},{3}),", hddPartitionsFromTable.First(h => h.host_and_port_agent_id == agentData.host_and_port_agent_id && h.partition_letter == disk.Name).id, disk.UsedSpace, agentData.host_and_port_agent_id, currentPeriodId);
                }
            }
            insertHddstatIntoJournal.CommandText = qInsertHddPartitionStat;
        }
        // запись данных о разделах в базу
        private static void insertPartitions()
        {
            var qInsertPartitions = "INSERT INTO hdd_partitions VALUES ";
            var qUpdatePartitions = "UPDATE hdd_partitions SET size='{0}' WHERE partition_letter='{1}' AND host_and_port_agent_id={2}";
            var updateHddPartitions = new SqlCommand { Connection = mainConnnection };
            // Если таблица с разделами пуста
            if (hddPartitionsFromTable.Count == 0)
            {
                agentDatas.ForEach(agentData => agentData.Disks.ForEach(disk =>
                {
                    qInsertPartitions += String.Format("({0},'{1}',{2}),", agentData.host_and_port_agent_id, disk.Name, disk.TotalSpace);
                }));
            }
            else
            {
                agentDatas.ForEach(agentData =>
                {
                    if (hddPartitionsFromTable.Any(x => x.host_and_port_agent_id == agentData.host_and_port_agent_id))
                    {
                        var onlyThisAgentPartitions = hddPartitionsFromTable.FindAll(x => x.host_and_port_agent_id == agentData.host_and_port_agent_id);
                        // Если размер размера изменился, или есть был добавлен новый раздел -> возможно стоит реализовать чтобы удалялись те разделы, которых больше нет
                        agentData.Disks.ForEach(disk =>
                        {
                            if (onlyThisAgentPartitions.Any(d => d.partition_letter == disk.Name && d.total_space != disk.TotalSpace))
                            {
                                updateHddPartitions.CommandText = String.Format(qUpdatePartitions, disk.TotalSpace,
                                    disk.Name, agentData.host_and_port_agent_id);
                                updateHddPartitions.ExecuteNonQuery();
                            }
                            else if (!onlyThisAgentPartitions.Any(d => d.partition_letter == disk.Name && d.total_space == disk.TotalSpace))
                            {
                                qInsertPartitions += String.Format("({0},'{1}',{2}),", agentData.host_and_port_agent_id, disk.Name, disk.TotalSpace);
                            }
                        });
                    }
                    // Если в базе нет записи о разделах этого компьютера вообще
                    else
                    {
                        agentData.Disks.ForEach(disk => qInsertPartitions += String.Format("({0},'{1}',{2}),", agentData.host_and_port_agent_id, disk.Name, disk.TotalSpace));
                    }
                });
            }
            if (qInsertPartitions[qInsertPartitions.Length - 1] != ' ')
            {
                insertHddPartitions.CommandText = removeLastComma(qInsertPartitions);
                insertHddPartitions.ExecuteNonQuery();
                insertHddPartitions.CommandText = "";
                readPartitionsFromTable();
            }
        }
        // вставить имена сервисов
        private static void insertServices()
        {
            var qInsertServices = "INSERT INTO services (name,readable_name) VALUES ";
            // Если нет ни единого имени сервиса в таблице
            if (servicesFromTable.Count == 0)
            {
               agentDatas.ForEach(a => a.Services.ForEach(s =>
               {
                   qInsertServices += String.Format("('{0}','{0}'),", s.Name.ToLower());
               }));
            }
            else
            {
                agentDatas.ForEach(a => a.Services.ForEach(s =>
                {
                    var isExist = servicesFromTable.Any(service => service.name == s.Name.ToLower());
                    if (!isExist)
                    {
                        qInsertServices += String.Format("('{0}','{0}'),", s.Name.ToLower());
                    }
                }));
            }
            if (qInsertServices[qInsertServices.Length - 1] != ' ')
            {
                insertServicesQuery.CommandText = removeLastComma(qInsertServices);
                Console.WriteLine(insertServicesQuery.CommandText);
                insertServicesQuery.ExecuteNonQuery();
                insertServicesQuery.CommandText = "";
                readAllServicesFromTable();
            }
        }
        // вставка статистики сервисов
        private static void insertStatusOfServicesIntoJournal()
        {
            var qInsertStatusesOfServicesIntoJournal = "INSERT INTO journal_of_services_statuses VALUES ";
            var InsertStatusesOfServicesIntoJournal = new SqlCommand { Connection = mainConnnection };
            agentDatas.ForEach(a => a.Services.ForEach(s =>
            {
                qInsertStatusesOfServicesIntoJournal += String.Format("({0},{1},{2},{3}),", a.host_and_port_agent_id,
                    currentPeriodId, getIdFromServiceName(s.Name), (s.Working ? 1 : 0));
            }));
            servicesFromTable.ForEach(x => Console.WriteLine(x.name + " - " + x.id));
            Console.WriteLine(qInsertStatusesOfServicesIntoJournal);
            if (qInsertStatusesOfServicesIntoJournal[qInsertStatusesOfServicesIntoJournal.Length - 1] != ' ')
            {
                InsertStatusesOfServicesIntoJournal.CommandText = removeLastComma(qInsertStatusesOfServicesIntoJournal);
                InsertStatusesOfServicesIntoJournal.ExecuteNonQuery();
            }
        }
        private static void notifyGenerator()
        {
            do
            {
                // Костыль, чтобы интервал был 60 секунд
                var _startTime = DateTime.UtcNow;
                Console.WriteLine("Notify Thread Started");
                // Бэкап справочника хостов и хостов с портами
                hosts_backup = hosts;
                hostsAndPorts_backup = hostsAndPorts;
                services_backup = servicesFromTable;
                hostsForWebCheck_backup = hostsAndPorts_backup.Where(x => x.type_of_host_and_port_id == 1).ToList();
                // Собираем список подписчиков
                whoAreSubscribers();
                // чтение статистики пинга
                readPingStat();
                // чтение статистики проверки портов
                readCheckPortStat();
                // чтение статистики о размере веб-страниц
                readCheckWebStat();
                // читаем статистику сервисов
                readServicesStat();
                // добавляем уведомления в очередь
                enqueueMessagesIntoSendQueue();
                var drawback = (int)(DateTime.UtcNow - _startTime).TotalSeconds;
                var sleepTime = (Interval - drawback) * 1000;
                Console.WriteLine("Notify thread finished in - " + drawback);
                Thread.Sleep(sleepTime);
            } while (_immediateStop != true);
        }
        // отправка сообщений на мыло, поток.
        private static void _sendMail()
        {
            string result;
            do
            {
                if (_mailQueue.TryDequeue(out result))
                {
                    Console.WriteLine(result);
                    SendMail(result);
                    Thread.Sleep(externalConfiguration.smtp.sleep_after_send_one_mail_message);
                }
                Thread.Sleep(5000);
            } while (true);
        }
        // Чтение информации о состоянии сервисов
        private static void readServicesStat()
        {
            var p = currentPeriodId;
            var results = new List<agentService>();
            var sqlc = new SqlCommand
            {
                Connection = notificationConnection,
                CommandText = String.Format("SELECT * FROM journal_of_services_statuses WHERE period_id={0}", p)
            };
            // Сначала прочитаем инфу о состоянии сервисов на текущий момент, забьем в класс
            var r = sqlc.ExecuteReader();
            while (r.Read())
            {
                if (r.HasRows)
                {
                    var agentId = r.GetInt32(1);
                    var serviceId = r.GetInt32(3);
                    var worked = r.GetBoolean(4);
                    if (results.Any(a => a.agentId == agentId))
                    {
                        var _ = results.First(a => a.agentId == agentId);
                        _.services.Add(new serviceData { ServiceId = serviceId, Worked = worked });
                    }
                    else
                    {
                        results.Add(new agentService { agentId = agentId, services = new List<serviceData>() });
                        var _ = results.First(a => a.agentId == agentId);
                        _.services.Add(new serviceData { ServiceId = serviceId, Worked = worked });
                    }
                }   
            }
            r.Close();
            // теперь заполняем счетчик
            if (_counterServices.Count == 0)
            {
                _counterServices = results;
            }
            else
            {
                results.ForEach(a =>
                {
                    if (_counterServices.Any(ca => ca.agentId == a.agentId))
                    {
                        var _ = _counterServices.First(ca => ca.agentId == a.agentId).services;
                        a.services.ForEach(sa =>
                        {
                            if (_.Any(csa => csa.ServiceId == sa.ServiceId))
                            {
                                var _csa = _.First(csa => csa.ServiceId == sa.ServiceId);
                                // Если сервис изменил статус
                                if (_csa.Worked != sa.Worked)
                                {
                                    _mailQueue.Enqueue(String.Format("Сервис {0} на агенте {1} изменил свой статус на {2}. Время события: {3}", services_backup.Where(serv => serv.id == sa.ServiceId).Select(n => n.readable_name).First(), hostsAndPorts_backup.Where(h => h.id == a.agentId).Select(n => n.name).First(), (sa.Worked ? "РАБОТАЕТ" : "ОСТАНОВЛЕН"), DateTime.Now));
                                    _csa.Worked = sa.Worked;
                                }
                                
                            }
                            // Если такого сервиса нет у агента
                            else
                            {
                                _.Add(new serviceData { ServiceId = sa.ServiceId, Worked = sa.Worked });
                            }
                        });
                    }
                    else
                    {
                        _counterServices.Add(a);
                    }
                });
            }
        }
        // чтение информации из журнала пинга хостов
        private static void readPingStat()
        {
            var p = currentPeriodId;
            var unansweredHosts = new List<int>();
            var readJournalOfPing = new SqlCommand { Connection = notificationConnection, CommandText = String.Format("SELECT host_id, latency FROM journal_of_ping_hosts WHERE period_id = {0}", p) };
            var readerJournalOfPing = readJournalOfPing.ExecuteReader();
            while (readerJournalOfPing.Read())
            {
                var host_id = readerJournalOfPing.GetInt32(0);
                var latency = readerJournalOfPing.GetInt16(1);
                // набиваем словарик ид-шниками, если такого идишника в словарике нет.
                if (!counter_avail_h.ContainsKey(host_id))
                {
                    counter_avail_h.Add(host_id, 0);
                }
                if (latency == 0)
                {
                    counter_avail_h[host_id] += 1;
                    // Это для записи в таблицу логов, успокойся.
                    unansweredHosts.Add(host_id);
                }
                else
                {
                    // Если хост ожил, тогда добавляем в спец словарь и потом пошлем об этом письмо
                    if (counter_avail_h[host_id] >= externalConfiguration.count_after_host_is_considered_as_alive)
                    {
                        resurrectHosts.Add(host_id);
                    }
                    // Если хост ожил  - тогда обнуляем счетчик
                    counter_avail_h[host_id] = 0;
                }   
            }
            readerJournalOfPing.Close();
        }
        // вставить во все это!
        private static void BatchExecuteNonQuery(List<SqlCommand> listQueries)
        {
            foreach (var listQuery in listQueries)
            {
                if (listQuery.CommandText.Length != 0)
                {
                    listQuery.CommandText = removeLastComma(listQuery.CommandText);
                    Console.WriteLine(listQuery.CommandText + " - "  + listQuery);
                    if (listQuery.CommandText[listQuery.CommandText.Length - 1] == ')')
                    {
                        listQuery.ExecuteNonQuery();
                        listQuery.CommandText = "";
                    }
                } 
            }
        }
        // чтение информации из журнала проверки портов
        private static void readCheckPortStat()
        {
            var p = currentPeriodId;
            var unansweredPortsInHosts = new List<int>();
            var readJournalOfPorts = new SqlCommand { Connection = notificationConnection, CommandText = String.Format("SELECT host_and_port_id, is_alive FROM journal_of_check_ports WHERE period_id = {0}", p) };
            var readerJournalOfCheckPorts = readJournalOfPorts.ExecuteReader();
            while (readerJournalOfCheckPorts.Read())
            {
                var host_and_port_id = readerJournalOfCheckPorts.GetInt32(0);
                var is_alive = readerJournalOfCheckPorts.GetBoolean(1);
                if (!counter_avail_p.ContainsKey(host_and_port_id))
                {
                    counter_avail_p.Add(host_and_port_id, 0);
                }
                if (!is_alive)
                {
                    counter_avail_p[host_and_port_id] += 1;
                    unansweredPortsInHosts.Add(host_and_port_id);
                }
                else
                {
                    // Если порт ожил, тогда добавляем в спец словарь и потом пошлем об этом письмо
                    if (counter_avail_p[host_and_port_id] >= externalConfiguration.count_after_host_is_considered_as_alive)
                    {
                        resurrectPorts.Add(host_and_port_id);
                    }
                    // Если хост ожил  - тогда обнуляем счетчик
                    counter_avail_p[host_and_port_id] = 0;
                }
                
            }
            readerJournalOfCheckPorts.Close();
            Console.WriteLine("Unanswered ports checking - ok");
        }

        // Добавить сообщения в очередь для отправки
        private static void enqueueMessagesIntoSendQueue()
        {
            // Набиваем очередь теми хостами, которые перестали отвечать
            if (counter_avail_h.Count != 0)
            {
                foreach (var h in counter_avail_h)
                {
                    if (h.Value == externalConfiguration.number_of_periods_after_to_send_notify)
                    {
                        _mailQueue.Enqueue(String.Format("{0} - недоступен в течение {1} минут. Сообщение отправлено: {2}", getNameIpOfHostFromId(h.Key, hosts_backup), externalConfiguration.number_of_periods_after_to_send_notify, DateTime.Now));
                    }
                }
            }
            // Набиваем очередь ожившими хостами
            if (resurrectHosts.Count != 0)
            {
                resurrectHosts.ForEach(h => _mailQueue.Enqueue(String.Format("{0} - снова доступен. Сообщение отправлено: {1}", getNameIpOfHostFromId(h, hosts_backup), DateTime.Now)));
            }
            resurrectHosts.Clear();
            // теперь про порты
            if (counter_avail_p.Count != 0)
            {
                foreach (var p in counter_avail_p)
                {
                    if (p.Value == externalConfiguration.number_of_periods_after_to_send_notify)
                    {
                        _mailQueue.Enqueue(String.Format("{0} - порт недоступен в течение {1} минут. Сообщение отправлено: {2}", getNameOfHostAndPortFromId(p.Key, hostsAndPorts_backup), externalConfiguration.number_of_periods_after_to_send_notify, DateTime.Now));
                    }
                }
            }
            if (resurrectPorts.Count != 0)
            {
                foreach (var p in resurrectPorts)
                {
                    _mailQueue.Enqueue(String.Format("{0} - снова доступен. Сообщение отправлено: {1}", getNameOfHostAndPortFromId(p, hostsAndPorts_backup), DateTime.Now));
                }
            }
            resurrectPorts.Clear();
        }
        // Удалить последнюю запятую
        private static string removeLastComma(string srcString)
        {
            var resultString = srcString;
            if (srcString[(srcString.Length - 1)] == ',')
            {
                resultString = srcString.Remove(srcString.Length - 1);
            }
            return resultString;
        }
        // Получить имя проверки веб-страницы исходя из ИД
        private static string getNameFromIdForHostAndPort(int id, List<HostAndPort> data)
        {
            return data.Any(x => x.id == id) ? data.Where(x => x.id == id).Select(f => f.name).First() : "";
        }

        // чтение информации из журнала размера веб-страниц
        private static void readCheckWebStat()
        {
            var p = currentPeriodId;
            var lastPeriodWebData = new List<webData>();
            var readLastWebStat = new SqlCommand
            {
                Connection = notificationConnection,
                CommandText = String.Format("SELECT host_and_port_id, size FROM journal_of_web_page_check WHERE period_id = {0}", p - 1)
            };
            var webStatReader = readLastWebStat.ExecuteReader();
            while (webStatReader.Read())
            {
                lastPeriodWebData.Add(new webData { host_and_port_id = webStatReader.GetInt32(0), size = webStatReader.GetInt32(1)});
            }
            webStatReader.Close();
            if (hostsForWebCheck_backup.Count != 0)
            {
                hostsForWebCheck_backup.ForEach(_ =>
                {
                    if (lastPeriodWebData.Any(l => l.host_and_port_id == _.id))
                    {
                        var _l = lastPeriodWebData.First(l => l.host_and_port_id == _.id);
                        if (_.size != _l.size)
                        {
                            _mailQueue.Enqueue(String.Format("{0} изменила размер страницы с {1} байт на {2} байт. Время: {3}", getNameFromIdForHostAndPort(_.id, hostsForWebCheck_backup), _l.size, _.size, DateTime.Now ));
                        }
                    }
                });
            }
        }
        // кто подписан, заполнить subscribers
        private static void whoAreSubscribers()
        {
            subscribers.Clear();
            var readSubscribers = new SqlCommand
            {
                Connection = notificationConnection,
                CommandText = "SELECT email FROM subscribers"
            };
            var readerSubscribers = readSubscribers.ExecuteReader();
            while (readerSubscribers.Read())
            {
                Console.WriteLine(readerSubscribers.GetString(0));
                subscribers.Add(readerSubscribers.GetString(0));
            }
            readerSubscribers.Close();
        }
        // чтение информации из справочников, потому что sqldatareader не thread-safe, вот дерьмо
        private static void fillDictionaries()
        {
            // чтение списка хостов из базы
            var getHosts = new SqlCommand("SELECT * FROM hosts") { Connection = mainConnnection };
            var hostsReader = getHosts.ExecuteReader();
            while (hostsReader.Read())
            {
                hosts.Add(new Host { id = hostsReader.GetInt32(0), name = hostsReader.GetString(1), ip_or_name = hostsReader.GetString(2), group_id = hostsReader.GetInt32(3) });
            }
            hostsReader.Close();
            // чтение хостов и портов из базы
            var hostsAndPortsTransaction = mainConnnection.BeginTransaction();
            var getHostsAndPorts = new SqlCommand("SELECT * FROM hosts_and_ports") { Connection = mainConnnection, Transaction = hostsAndPortsTransaction };
            var hostsAndPortsReader = getHostsAndPorts.ExecuteReader();
            while (hostsAndPortsReader.Read())
            {
                
                var route = "";
                try { route = hostsAndPortsReader.GetString(5); }
                catch { }
                var port = hostsAndPortsReader.GetInt32(2);
                hostsAndPorts.Add(new HostAndPort { id = hostsAndPortsReader.GetInt32(0), domainNameIp = getNameIpOfHostFromId(hostsAndPortsReader.GetInt32(1), hosts), port = port, name = hostsAndPortsReader.GetString(3), type_of_host_and_port_id = hostsAndPortsReader.GetInt32(4), route = route });
            }
            hostsAndPortsReader.Close();
            hostsAndPortsTransaction.Commit();
            // Чтение списка интерфейсов из базы
            readInterfacesFromTable();
            // чтение объемов оперативной памяти из базы
            var selectAllMemory = new SqlCommand {Connection = mainConnnection, CommandText = "SELECT * FROM memory"};
            var selectAllMemoryReader = selectAllMemory.ExecuteReader();
            while (selectAllMemoryReader.Read())
            {
                if (selectAllMemoryReader.HasRows)
                {
                    memoryFromTable.Add(selectAllMemoryReader.GetInt32(0), selectAllMemoryReader.GetInt32(1));
                }
            }
            selectAllMemoryReader.Close();
            // чтение разделов жестких дисков из базы данных
            readPartitionsFromTable();
            // считываем список всех сервисов
            readAllServicesFromTable();
        }
        // выбрать все сервисы из базы
        private static void readAllServicesFromTable()
        {
            var selectAllServices = new SqlCommand { Connection = mainConnnection, CommandText = "SELECT * FROM services" };
            var sr = selectAllServices.ExecuteReader();
            while (sr.Read())
            {
                if (sr.HasRows)
                {
                    servicesFromTable.Add(new ServiceT { id = sr.GetInt32(0), name = sr.GetString(1), readable_name = sr.GetString(2) });
                }
            }
            sr.Close();
        }
        // выбрать все разделы из базы
        private static void readPartitionsFromTable()
        {
            var selectAllPartitions = new SqlCommand { Connection = mainConnnection, CommandText = "SELECT * FROM hdd_partitions" };
            var selectAllPartitionsReader = selectAllPartitions.ExecuteReader();
            while (selectAllPartitionsReader.Read())
            {
                if (selectAllPartitionsReader.HasRows)
                {
                    hddPartitionsFromTable.Add(new HddPartitionsT { id = selectAllPartitionsReader.GetInt32(0), host_and_port_agent_id = selectAllPartitionsReader.GetInt32(1), partition_letter = selectAllPartitionsReader.GetString(2), total_space = selectAllPartitionsReader.GetInt32(3) });
                }
            }
            selectAllPartitionsReader.Close();
        }
        // прочесть тнтерфейсы из базы
        private static void readInterfacesFromTable()
        {
            var qGetInterfaces = new SqlCommand("SELECT * FROM interfaces") { Connection = mainConnnection };
            var interfacesReader = qGetInterfaces.ExecuteReader();
            while (interfacesReader.Read())
            {
                if (interfacesReader.HasRows)
                {
                    interfacesFromTable.Add(new InterfaceT { id = interfacesReader.GetInt32(0), name = interfacesReader.GetString(1), guid = interfacesReader.GetString(2), host_and_port_agent_id = interfacesReader.GetInt32(3) });
                }
            }
            interfacesReader.Close();
        }
        // Инициализацяи конфига
        private static void initConfig()
        {
            var stream = File.OpenText(@"config.json");
            var configRaw = stream.ReadToEnd();
            stream.Close();
            externalConfiguration = JsonConvert.DeserializeObject<ExternalConfiguration>(configRaw);
        }
        // Очистка собранных данных
        private static void clearTemporaryData()
        {
            var data = new List<dynamic> { hosts, hostsAndPorts, hostsForWebCheck, agentDatas, interfacesFromTable, idsAgentsAndCurrentPeriod, idsAgentsAndPeriodAndAgentsIdCurrentPeriod, memoryFromTable, hddPartitionsFromTable, servicesFromTable };
            foreach (dynamic o in data)
            {
                if (o != null) o.Clear();
            }
        }
        // Пинг
        private static void PingHosts()
        {
            hosts.AsParallel().ForAll(h => { lock (h) { h.latency = PingHost(h.ip_or_name); } });
            Console.WriteLine("[PING HOSTS - ready]");
        }
        // Проверка доступновсти портов на хостах
        private static void CheckPorts()
        {
            // отсортируем только для проверки порта = 2 это для проверки порта ключ
            forPortCheck = hostsAndPorts.Where(h => h.type_of_host_and_port_id == 2).ToList();
            forPortCheck.AsParallel().ForAll(h =>
            {
                lock (h) h.isAlive = CheckAvailibilityOfPort(h.domainNameIp, h.port); 
            });
            Console.WriteLine("[CHECK PORTS - ready]");
        }

        // получить имя или ип хоста исходя из ид
        private static string getNameIpOfHostFromId(int id, List<Host> h)
        {
            return h.Any(host => host.id == id) ? h.Where(host => host.id == id).Select(f => f.ip_or_name).First() : "";
        }

        // Получить имя хоста и порта исходя из ид
        private static string getNameOfHostAndPortFromId(int id, List<HostAndPort> h)
        {
            return h.Any(host => host.id == id) ? h.Where(host => host.id == id).Select(f => f.name).First() : "";
        }
        // получить id service исходя из его имени
        private static int getIdFromServiceName(string name)
        {
            return servicesFromTable.Where(s => s.name == name.ToLower()).Select(service => service.id).First();
        }
        // Проверка доступности порта
        private static int CheckAvailibilityOfPort(string server, int port)
        {
            var _ = 1;
            if (externalConfiguration.thoughtfulMode.port)
            {
                var first = _checkPort(server, port);
                if (first == 0) _ = _checkPort(server, port);
            }
            else _ = _checkPort(server, port);
            return _;
        }
        // _проверка порта
        private static int _checkPort(string server, int port)
        {
            sweet_sleep();
            // http://social.msdn.microsoft.com/Forums/vstudio/en-us/2281199d-cd28-4b5c-95dc-5a888a6da30d/tcpclientconnect-timeout?forum=csharpgeneral
            using (var tcp = new TcpClient())
            {
                var ar = tcp.BeginConnect(server, port, null, null);
                var wh = ar.AsyncWaitHandle;
                try
                {
                    if (!ar.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(externalConfiguration.timeouts.for_check_port), false))
                    {
                        tcp.Close();
                        return 0;
                    }
                    else
                    {
                        return 1;
                    }
                }
                finally
                {
                    wh.Close();
                }
            }
        }

        // Пинг Хоста
        private static long PingHost(string host)
        {
            long _ = 0;
            // внимательный пинг - т.е. два раза пингуется, а не один
            if (externalConfiguration.thoughtfulMode.ping)
            {
                long first = _ping(host);
                if (first != 0) _ = first;
                else
                {
                    long second = _ping(host);
                    if (first != 0 && second != 0) _ = (first + second) / 2;
                    if (first == 0 && second != 0) _ = second;
                    if (first == 0 && second == 0) _ = 0;
                } 
            }
            // если один пакет потерялся, все, катастрофа
            else _ = _ping(host);
            return _;
        }
        // пингануть единожды
        private static long _ping(string host)
        {
            sweet_sleep();
            try
            {
                var p = new Ping();
                PingReply pr = p.Send(host, externalConfiguration.timeouts.for_ping);
                // если хост пинганулся, но время отклика меньше 1 мс
                if (pr.Status == IPStatus.Success && pr.RoundtripTime < 1) return 1;
                if (pr.Status == IPStatus.DestinationHostUnreachable || pr.Status == IPStatus.TimedOut) return 0;
                else return pr.RoundtripTime;
            }
            catch
            {
                Console.WriteLine("{0} - ping failed", host);
                return 0;
            }
        } 
        // проверка всех веб-страниц
        private static void checkWeb()
        {
            hostsForWebCheck = hostsAndPorts.Where(h => h.type_of_host_and_port_id == 1).ToList();
                // получим размеры страницы
            Parallel.ForEach(hostsForWebCheck, hostAndPort =>
            {
                var routeTemplate = "{0}://" + hostAndPort.domainNameIp + "{1}/{2}";
                var routeOk = (hostAndPort.port == 443) ? String.Format(routeTemplate, "https", "", hostAndPort.route) : String.Format(routeTemplate, "http", ":" + hostAndPort.port, hostAndPort.route);
                Console.WriteLine(routeOk);
                sweet_sleep();
                try
                {
                    lock (hostAndPort) hostAndPort.size = _checkWebPageSize(routeOk);
                    Console.WriteLine("размер - " + hostAndPort.size);
                }
                catch (Exception x)
                {
                    Console.WriteLine(x);
                    Console.WriteLine("размер - " + hostAndPort.size);
                    lock (hostAndPort) hostAndPort.size = 0;
                }
            });
        }
        // проверка размера одной веб-страницы
        private static int _checkWebPageSize(string route)
        {
            var finalResult = 0;
            var firstTry = requestAsync(route, true).Result;
            Thread.Sleep(externalConfiguration.timeouts.for_web_page_check);
            if (externalConfiguration.thoughtfulMode.web)
            {
                finalResult = firstTry == 0 ? requestAsync(route, true).Result : firstTry;
            }
            else
                finalResult = firstTry;
            return finalResult;
        }
        // http://msdn.microsoft.com/en-us/library/hh191443%28v=vs.110%29.aspx
        static async Task<dynamic> requestAsync(string url, bool isSize)
        {
            var client = new HttpClient
            {
                Timeout =
                    isSize
                        ? TimeSpan.FromMilliseconds(externalConfiguration.timeouts.for_web_page_check)
                        : TimeSpan.FromMilliseconds(externalConfiguration.timeouts.for_get_from_agent)
            };
            var getStringTask = client.GetStringAsync(url);
            var content = await getStringTask;
            if (isSize) return content.Length;
            else return content;

        }
        // Сбор данных с агентов - асинхронный
        //private static void GetFromAgents()
        //{
        //    var agents = hostsAndPorts.Where(a => a.type_of_host_and_port_id == 3).ToList();
        //    Parallel.ForEach(agents, agent =>
        //    {
        //        sweet_sleep();
        //        try
        //        {
        //            var response = JsonConvert.DeserializeObject<AgentData>(requestAsync(String.Format("http://{0}:{1}", agent.domainNameIp, agent.port), false).Result);
        //            response.host_and_port_agent_id = agent.id;
        //            lock (agentDatas) agentDatas.Add(response);
        //        }
        //        catch {}
        //    });
        //}
        // Сбор данных с агентов - синхронный
        private static void GetFromAgents()
        {
            Console.WriteLine("Getting started gather information from agents");
            // собираем агентов в лист
            var agents = hostsAndPorts.Where(a => a.type_of_host_and_port_id == 3).ToList();
            // Сбор данных от агентов
            Parallel.ForEach(agents, agent =>
            {
                Console.WriteLine(agent.domainNameIp + "- go!");
                sweet_sleep();
                try
                {
                    var request = String.Format("http://{0}:{1}", agent.domainNameIp, agent.port);
                    var webReq = WebRequest.Create(request);
                    webReq.Timeout = externalConfiguration.timeouts.for_get_from_agent;
                    var webResp = webReq.GetResponse();
                    var stream = webResp.GetResponseStream();
                    var reader = new StreamReader(stream, Encoding.UTF8);
                    var response = reader.ReadToEnd();
                    reader.Close();
                    if (stream != null) stream.Close();
                    webReq.Abort();
                    var rawAgentData = JsonConvert.DeserializeObject<AgentData>(response);
                    rawAgentData.host_and_port_agent_id = agent.id;
                    lock (agentDatas) agentDatas.Add(rawAgentData);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Timeout from agent - " + agent.domainNameIp + ex.Message);
                }
            });
        }
        // Отправка письма на email c темой - http://stud-work.ru/index.php/c-sharp-mail-send-prostoj-primer-c-otpravka-email
        private static bool SendMail(string caption)
        {
            var mail = new MailMessage();
            var client = new SmtpClient
            {
                Host = externalConfiguration.smtp.server,
                Port = externalConfiguration.smtp.port,
                EnableSsl = externalConfiguration.smtp.ssl,
                Credentials = new NetworkCredential(externalConfiguration.smtp.from.Split('@')[0], externalConfiguration.smtp.password),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = externalConfiguration.timeouts.for_smtp_mail_send
            };
            sweet_sleep();
            client.ServicePoint.MaxIdleTime = 1;
            client.ServicePoint.ConnectionLimit = 100;
            try
            {
                mail.From = new MailAddress(externalConfiguration.smtp.from);
                // Добавляем в список адресатов всех подписчиков
                subscribers.ForEach(subscriber => mail.To.Add(new MailAddress(subscriber)));
                mail.Subject = caption;
                client.Send(mail);
                Console.WriteLine("Message sended");
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                return false;
            }
        }
        // сон во время операций - без этого иногда пинга нет от того, у кого 100% он должен быть, наверное что все единомоментно запускаются и не вывозит сет. соединение
        private static void sweet_sleep()
        {
            if (externalConfiguration.sleep.when_operate)
            {
                var how_long_to_sleep = new Random().Next(externalConfiguration.sleep.min_mseconds_sleep_when_operate, externalConfiguration.sleep.max_mseconds_sleep_when_operate);
                Thread.Sleep(how_long_to_sleep);
            }
        } 
    }
}
