using System;

namespace agentnnmd
{
    internal class AgentNNMd
    {
        private static void Main(string[] args)
        {
            AgentNNMServer.StartListen();
            Console.ReadLine();
        }
    }
}