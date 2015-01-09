﻿namespace NonameNetworkMonitor
{
    class ExternalConfiguration
    {
        public string connection_string { get; set; }
        public SmtpConfig smtp { get; set; }
        public Timeouts timeouts { get; set; }
        public Sleep sleep { get; set; }
        public int number_of_periods_after_to_send_notify { get; set; }
        public int count_after_host_is_considered_as_alive { get; set; }
        public Thoughtful thoughtfulMode { get; set; }
    }

    class Thoughtful
    {
        public bool ping { get; set; }
        public bool port { get; set; }
        public bool web { get; set; }
        public bool agent { get; set; }
    }

    class SmtpConfig
    {
        public string server { get; set; }
        public int port { get; set; }
        public bool ssl { get; set; }
        public string from { get; set; }
        public string password { get; set; }
        public bool notification { get; set; }
        public int sleep_after_send_one_mail_message { get; set; }
    }

    class Timeouts
    {
        public int for_web_page_check { get; set; }
        public int for_get_from_agent { get; set; }
        public int for_ping { get; set; }
        public int for_check_port { get; set; }
        public int for_smtp_mail_send { get; set; }
    }

    class Sleep
    {
        public bool when_operate { get; set; }
        public int max_mseconds_sleep_when_operate { get; set; }
        public int min_mseconds_sleep_when_operate { get; set; }
    }
}
