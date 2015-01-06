using System;
using System.Diagnostics;
using System.Threading;

namespace NonameNetworkMonitor
{
    class StartServiceNNM
    {
        private static ServiceNonameNetworkMonitor service = new ServiceNonameNetworkMonitor();
        static void Main(string[] args)
        {
            service.Start();
        }
    }
}
