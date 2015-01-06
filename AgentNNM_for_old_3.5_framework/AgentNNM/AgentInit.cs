using System;
using System.Windows.Forms;


namespace AgentNonameNetworkMonitor
{
    static class AgentInit
    {
        // Инициализация
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new AgentForm());
        }
       
    }
}
