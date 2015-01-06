using System.Collections.Generic;

namespace NonameNetworkMonitor
{
    class serviceData
    {
        public int ServiceId { get; set; }
        public bool Worked { get; set; }
    }

    class agentService
    {
        public int agentId { get; set; }
        public List<serviceData> services { get; set; } 
    }
}
