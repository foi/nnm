USE master;
GO

IF db_id('noname_network_monitor') IS NULL 
    CREATE DATABASE noname_network_monitor
GO

USE [noname_network_monitor]
GO
/****** Object:  Table [dbo].[agents_cpu_mem_load]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[agents_cpu_mem_load](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[cpu_load] [int] NOT NULL,
	[free_mem] [int] NOT NULL,
	[agent_id] [int] NOT NULL,
	[period_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[groups]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[groups](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[hdd_partitions]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[hdd_partitions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[host_and_port_agent_id] [int] NOT NULL,
	[partition_letter] [varchar](30) NOT NULL,
	[total_space] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[hdd_stat_journal]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[hdd_stat_journal](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[hdd_partition_id] [int] NOT NULL,
	[size] [int] NOT NULL,
	[agent_id] [int] NOT NULL,
	[period_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[hosts]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[hosts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](50) NOT NULL,
	[ip_or_name] [nvarchar](30) NOT NULL,
	[group_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[ip_or_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[hosts_and_ports]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[hosts_and_ports](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[host_id] [int] NOT NULL,
	[port] [int] NOT NULL,
	[name] [varchar](50) NOT NULL,
	[type_of_host_and_port_id] [int] NOT NULL,
	[route] [varchar](30) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [hosts_and_ports_uq] UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[interfaces]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[interfaces](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [varchar](50) NOT NULL,
	[guid] [varchar](50) NOT NULL,
	[host_and_port_agent_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[guid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[interfaces_stat_journal]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[interfaces_stat_journal](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[agent_id] [int] NOT NULL,
	[interface_id] [int] NOT NULL,
	[upload] [int] NOT NULL,
	[download] [int] NOT NULL,
	[period_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[journal_of_check_ports]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[journal_of_check_ports](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[period_id] [int] NOT NULL,
	[host_and_port_id] [int] NOT NULL,
	[is_alive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[journal_of_ping_hosts]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[journal_of_ping_hosts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[period_id] [int] NOT NULL,
	[host_id] [int] NOT NULL,
	[latency] [smallint] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[journal_of_services_statuses]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[journal_of_services_statuses](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[agent_id] [int] NOT NULL,
	[period_id] [int] NOT NULL,
	[service_id] [int] NOT NULL,
	[status] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[journal_of_web_page_check]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[journal_of_web_page_check](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[host_and_port_id] [int] NOT NULL,
	[size] [int] NOT NULL,
	[period_id] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[memory]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[memory](
	[host_and_port_agent_id] [int] NOT NULL,
	[memory_overall] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[host_and_port_agent_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[periods]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[periods](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[period] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[period] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
/****** Object:  Table [dbo].[services]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[services](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [varchar](50) NOT NULL,
	[readable_name] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[subscribers]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[subscribers](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[email] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
/****** Object:  Table [dbo].[types_of_host_and_port]    Script Date: 14.12.2014 18:32:56 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_PADDING ON
GO
CREATE TABLE [dbo].[types_of_host_and_port](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [varchar](40) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO
SET ANSI_PADDING OFF
GO
ALTER TABLE [dbo].[agents_cpu_mem_load]  WITH CHECK ADD  CONSTRAINT [agent_id_fk] FOREIGN KEY([agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[agents_cpu_mem_load] CHECK CONSTRAINT [agent_id_fk]
GO
ALTER TABLE [dbo].[agents_cpu_mem_load]  WITH CHECK ADD  CONSTRAINT [period_id_fk] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
GO
ALTER TABLE [dbo].[agents_cpu_mem_load] CHECK CONSTRAINT [period_id_fk]
GO
ALTER TABLE [dbo].[hdd_partitions]  WITH CHECK ADD  CONSTRAINT [host_and_port_agent_id] FOREIGN KEY([host_and_port_agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[hdd_partitions] CHECK CONSTRAINT [host_and_port_agent_id]
GO
ALTER TABLE [dbo].[hdd_stat_journal]  WITH CHECK ADD  CONSTRAINT [hdd_stat_journal_fk] FOREIGN KEY([hdd_partition_id])
REFERENCES [dbo].[hdd_partitions] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[hdd_stat_journal] CHECK CONSTRAINT [hdd_stat_journal_fk]
GO
ALTER TABLE [dbo].[hdd_stat_journal]  WITH CHECK ADD  CONSTRAINT [hdd_stat_journal_fk2] FOREIGN KEY([agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
GO
ALTER TABLE [dbo].[hdd_stat_journal] CHECK CONSTRAINT [hdd_stat_journal_fk2]
GO
ALTER TABLE [dbo].[hdd_stat_journal]  WITH CHECK ADD  CONSTRAINT [hdd_stat_journal_fk3] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
GO
ALTER TABLE [dbo].[hdd_stat_journal] CHECK CONSTRAINT [hdd_stat_journal_fk3]
GO
ALTER TABLE [dbo].[hosts]  WITH CHECK ADD  CONSTRAINT [group_id_for_host] FOREIGN KEY([group_id])
REFERENCES [dbo].[groups] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[hosts] CHECK CONSTRAINT [group_id_for_host]
GO
ALTER TABLE [dbo].[hosts_and_ports]  WITH CHECK ADD  CONSTRAINT [host_id_for_host_id_from_hosts] FOREIGN KEY([host_id])
REFERENCES [dbo].[hosts] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[hosts_and_ports] CHECK CONSTRAINT [host_id_for_host_id_from_hosts]
GO
ALTER TABLE [dbo].[hosts_and_ports]  WITH CHECK ADD  CONSTRAINT [id_for_host_and_port] FOREIGN KEY([type_of_host_and_port_id])
REFERENCES [dbo].[types_of_host_and_port] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[hosts_and_ports] CHECK CONSTRAINT [id_for_host_and_port]
GO
ALTER TABLE [dbo].[interfaces]  WITH CHECK ADD  CONSTRAINT [interfaces__host_nad_port_id_fk] FOREIGN KEY([host_and_port_agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[interfaces] CHECK CONSTRAINT [interfaces__host_nad_port_id_fk]
GO
ALTER TABLE [dbo].[interfaces_stat_journal]  WITH CHECK ADD  CONSTRAINT [agent_id] FOREIGN KEY([agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
GO
ALTER TABLE [dbo].[interfaces_stat_journal] CHECK CONSTRAINT [agent_id]
GO
ALTER TABLE [dbo].[interfaces_stat_journal]  WITH CHECK ADD  CONSTRAINT [interface_id_fk] FOREIGN KEY([interface_id])
REFERENCES [dbo].[interfaces] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[interfaces_stat_journal] CHECK CONSTRAINT [interface_id_fk]
GO
ALTER TABLE [dbo].[interfaces_stat_journal]  WITH CHECK ADD  CONSTRAINT [period_id] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
GO
ALTER TABLE [dbo].[interfaces_stat_journal] CHECK CONSTRAINT [period_id]
GO
ALTER TABLE [dbo].[journal_of_check_ports]  WITH CHECK ADD  CONSTRAINT [id_host_and_port] FOREIGN KEY([host_and_port_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_check_ports] CHECK CONSTRAINT [id_host_and_port]
GO
ALTER TABLE [dbo].[journal_of_check_ports]  WITH CHECK ADD  CONSTRAINT [id_period_from_periods] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_check_ports] CHECK CONSTRAINT [id_period_from_periods]
GO
ALTER TABLE [dbo].[journal_of_ping_hosts]  WITH CHECK ADD  CONSTRAINT [id_for_host_from_hosts] FOREIGN KEY([host_id])
REFERENCES [dbo].[hosts] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_ping_hosts] CHECK CONSTRAINT [id_for_host_from_hosts]
GO
ALTER TABLE [dbo].[journal_of_ping_hosts]  WITH CHECK ADD  CONSTRAINT [period_for_period_id_from_periods] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_ping_hosts] CHECK CONSTRAINT [period_for_period_id_from_periods]
GO
ALTER TABLE [dbo].[journal_of_services_statuses]  WITH CHECK ADD  CONSTRAINT [journal_of_services_statuses_fk] FOREIGN KEY([agent_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_services_statuses] CHECK CONSTRAINT [journal_of_services_statuses_fk]
GO
ALTER TABLE [dbo].[journal_of_services_statuses]  WITH CHECK ADD  CONSTRAINT [journal_of_services_statuses_fk2] FOREIGN KEY([period_id])
REFERENCES [dbo].[periods] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_services_statuses] CHECK CONSTRAINT [journal_of_services_statuses_fk2]
GO
ALTER TABLE [dbo].[journal_of_services_statuses]  WITH CHECK ADD  CONSTRAINT [journal_of_services_statuses_fk3] FOREIGN KEY([service_id])
REFERENCES [dbo].[services] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_services_statuses] CHECK CONSTRAINT [journal_of_services_statuses_fk3]
GO
ALTER TABLE [dbo].[journal_of_web_page_check]  WITH CHECK ADD  CONSTRAINT [id_of_host_and_port] FOREIGN KEY([host_and_port_id])
REFERENCES [dbo].[hosts_and_ports] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[journal_of_web_page_check] CHECK CONSTRAINT [id_of_host_and_port]
GO

/****** CREATE DEFAULT VALUES IN TABLES  ******/
INSERT INTO [dbo].[types_of_host_and_port]
		([name])
	VALUES
		('Web'),
		('Port check'),
		('Agent')
GO

INSERT INTO [dbo].[groups]
		([name])
	VALUES
		('Локальная сеть'),
		('Интернет'),
		('Защищенная сеть')
GO

INSERT INTO [dbo].[hosts]
		([name]
		,[ip_or_name]
		,[group_id])
	VALUES
		('Google DNS'
		,'8.8.8.8'
		,2)
GO