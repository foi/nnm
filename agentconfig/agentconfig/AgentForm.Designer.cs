namespace agentconfig
{
    partial class AgentForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(AgentForm));
            this.configGroupBox = new System.Windows.Forms.GroupBox();
            this.HardcoreCheckBox = new System.Windows.Forms.CheckBox();
            this.WebCheckListTextBox = new System.Windows.Forms.TextBox();
            this.WebCheckBox = new System.Windows.Forms.CheckBox();
            this.HostsLabel = new System.Windows.Forms.Label();
            this.SubscribersLabel = new System.Windows.Forms.Label();
            this.SubscribersTextBox = new System.Windows.Forms.TextBox();
            this.IntervalLabel = new System.Windows.Forms.Label();
            this.IntervalTextBox = new System.Windows.Forms.TextBox();
            this.PasswordLabel = new System.Windows.Forms.Label();
            this.LoginLabel = new System.Windows.Forms.Label();
            this.PasswordTextBox = new System.Windows.Forms.TextBox();
            this.LoginTextBox = new System.Windows.Forms.TextBox();
            this.SslCheckbox = new System.Windows.Forms.CheckBox();
            this.SmtpPortLabel = new System.Windows.Forms.Label();
            this.SmtpPortTextbox = new System.Windows.Forms.TextBox();
            this.SmtpServerLabel = new System.Windows.Forms.Label();
            this.SmtpServerTextbox = new System.Windows.Forms.TextBox();
            this.PerformPingNotifyCheckBox = new System.Windows.Forms.CheckBox();
            this.HostsTextbox = new System.Windows.Forms.TextBox();
            this.servicesCheckedListBox = new System.Windows.Forms.CheckedListBox();
            this.servicesLabel = new System.Windows.Forms.Label();
            this.ignoreInterfacesTextBox = new System.Windows.Forms.TextBox();
            this.saveButton = new System.Windows.Forms.Button();
            this.statusLabel = new System.Windows.Forms.Label();
            this.ignoreInterfacesLabel = new System.Windows.Forms.Label();
            this.interfaceTextBox = new System.Windows.Forms.TextBox();
            this.InterfaceLabel = new System.Windows.Forms.Label();
            this.portTextBox = new System.Windows.Forms.TextBox();
            this.portLabel = new System.Windows.Forms.Label();
            this.statusLabelLabel = new System.Windows.Forms.Label();
            this.configGroupBox.SuspendLayout();
            this.SuspendLayout();
            // 
            // configGroupBox
            // 
            this.configGroupBox.Controls.Add(this.HardcoreCheckBox);
            this.configGroupBox.Controls.Add(this.WebCheckListTextBox);
            this.configGroupBox.Controls.Add(this.WebCheckBox);
            this.configGroupBox.Controls.Add(this.HostsLabel);
            this.configGroupBox.Controls.Add(this.SubscribersLabel);
            this.configGroupBox.Controls.Add(this.SubscribersTextBox);
            this.configGroupBox.Controls.Add(this.IntervalLabel);
            this.configGroupBox.Controls.Add(this.IntervalTextBox);
            this.configGroupBox.Controls.Add(this.PasswordLabel);
            this.configGroupBox.Controls.Add(this.LoginLabel);
            this.configGroupBox.Controls.Add(this.PasswordTextBox);
            this.configGroupBox.Controls.Add(this.LoginTextBox);
            this.configGroupBox.Controls.Add(this.SslCheckbox);
            this.configGroupBox.Controls.Add(this.SmtpPortLabel);
            this.configGroupBox.Controls.Add(this.SmtpPortTextbox);
            this.configGroupBox.Controls.Add(this.SmtpServerLabel);
            this.configGroupBox.Controls.Add(this.SmtpServerTextbox);
            this.configGroupBox.Controls.Add(this.PerformPingNotifyCheckBox);
            this.configGroupBox.Controls.Add(this.HostsTextbox);
            this.configGroupBox.Controls.Add(this.servicesCheckedListBox);
            this.configGroupBox.Controls.Add(this.servicesLabel);
            this.configGroupBox.Controls.Add(this.ignoreInterfacesTextBox);
            this.configGroupBox.Controls.Add(this.saveButton);
            this.configGroupBox.Controls.Add(this.statusLabel);
            this.configGroupBox.Controls.Add(this.ignoreInterfacesLabel);
            this.configGroupBox.Controls.Add(this.interfaceTextBox);
            this.configGroupBox.Controls.Add(this.InterfaceLabel);
            this.configGroupBox.Controls.Add(this.portTextBox);
            this.configGroupBox.Controls.Add(this.portLabel);
            this.configGroupBox.Location = new System.Drawing.Point(4, 12);
            this.configGroupBox.Name = "configGroupBox";
            this.configGroupBox.Size = new System.Drawing.Size(413, 525);
            this.configGroupBox.TabIndex = 0;
            this.configGroupBox.TabStop = false;
            this.configGroupBox.Text = "Конфигурация";
            // 
            // HardcoreCheckBox
            // 
            this.HardcoreCheckBox.AutoSize = true;
            this.HardcoreCheckBox.Location = new System.Drawing.Point(253, 317);
            this.HardcoreCheckBox.Name = "HardcoreCheckBox";
            this.HardcoreCheckBox.Size = new System.Drawing.Size(89, 17);
            this.HardcoreCheckBox.TabIndex = 39;
            this.HardcoreCheckBox.Text = "Тщательно?";
            this.HardcoreCheckBox.UseVisualStyleBackColor = true;
            // 
            // WebCheckListTextBox
            // 
            this.WebCheckListTextBox.Location = new System.Drawing.Point(9, 291);
            this.WebCheckListTextBox.Name = "WebCheckListTextBox";
            this.WebCheckListTextBox.Size = new System.Drawing.Size(398, 20);
            this.WebCheckListTextBox.TabIndex = 38;
            // 
            // WebCheckBox
            // 
            this.WebCheckBox.AutoSize = true;
            this.WebCheckBox.Location = new System.Drawing.Point(9, 268);
            this.WebCheckBox.Name = "WebCheckBox";
            this.WebCheckBox.Size = new System.Drawing.Size(239, 17);
            this.WebCheckBox.TabIndex = 37;
            this.WebCheckBox.Text = "Выполнять проверку следующих страниц ";
            this.WebCheckBox.UseVisualStyleBackColor = true;
            // 
            // HostsLabel
            // 
            this.HostsLabel.AutoSize = true;
            this.HostsLabel.Location = new System.Drawing.Point(9, 454);
            this.HostsLabel.Name = "HostsLabel";
            this.HostsLabel.Size = new System.Drawing.Size(177, 13);
            this.HostsLabel.TabIndex = 36;
            this.HostsLabel.Text = "Список ip/доменных имен хостов";
            // 
            // SubscribersLabel
            // 
            this.SubscribersLabel.AutoSize = true;
            this.SubscribersLabel.Location = new System.Drawing.Point(92, 415);
            this.SubscribersLabel.Name = "SubscribersLabel";
            this.SubscribersLabel.Size = new System.Drawing.Size(154, 13);
            this.SubscribersLabel.TabIndex = 35;
            this.SubscribersLabel.Text = "Список ящиков подписчиков";
            // 
            // SubscribersTextBox
            // 
            this.SubscribersTextBox.Location = new System.Drawing.Point(95, 431);
            this.SubscribersTextBox.Name = "SubscribersTextBox";
            this.SubscribersTextBox.Size = new System.Drawing.Size(311, 20);
            this.SubscribersTextBox.TabIndex = 34;
            // 
            // IntervalLabel
            // 
            this.IntervalLabel.AutoSize = true;
            this.IntervalLabel.Location = new System.Drawing.Point(9, 415);
            this.IntervalLabel.Name = "IntervalLabel";
            this.IntervalLabel.Size = new System.Drawing.Size(83, 13);
            this.IntervalLabel.TabIndex = 33;
            this.IntervalLabel.Text = "Интервал (сек)";
            // 
            // IntervalTextBox
            // 
            this.IntervalTextBox.Location = new System.Drawing.Point(9, 431);
            this.IntervalTextBox.Name = "IntervalTextBox";
            this.IntervalTextBox.Size = new System.Drawing.Size(79, 20);
            this.IntervalTextBox.TabIndex = 32;
            // 
            // PasswordLabel
            // 
            this.PasswordLabel.AutoSize = true;
            this.PasswordLabel.Location = new System.Drawing.Point(180, 376);
            this.PasswordLabel.Name = "PasswordLabel";
            this.PasswordLabel.Size = new System.Drawing.Size(45, 13);
            this.PasswordLabel.TabIndex = 31;
            this.PasswordLabel.Text = "Пароль";
            // 
            // LoginLabel
            // 
            this.LoginLabel.AutoSize = true;
            this.LoginLabel.Location = new System.Drawing.Point(9, 376);
            this.LoginLabel.Name = "LoginLabel";
            this.LoginLabel.Size = new System.Drawing.Size(38, 13);
            this.LoginLabel.TabIndex = 30;
            this.LoginLabel.Text = "Логин";
            // 
            // PasswordTextBox
            // 
            this.PasswordTextBox.Location = new System.Drawing.Point(182, 392);
            this.PasswordTextBox.Name = "PasswordTextBox";
            this.PasswordTextBox.Size = new System.Drawing.Size(224, 20);
            this.PasswordTextBox.TabIndex = 29;
            // 
            // LoginTextBox
            // 
            this.LoginTextBox.Location = new System.Drawing.Point(9, 392);
            this.LoginTextBox.Name = "LoginTextBox";
            this.LoginTextBox.Size = new System.Drawing.Size(167, 20);
            this.LoginTextBox.TabIndex = 28;
            // 
            // SslCheckbox
            // 
            this.SslCheckbox.AutoSize = true;
            this.SslCheckbox.Location = new System.Drawing.Point(346, 353);
            this.SslCheckbox.Name = "SslCheckbox";
            this.SslCheckbox.Size = new System.Drawing.Size(52, 17);
            this.SslCheckbox.TabIndex = 27;
            this.SslCheckbox.Text = "SSL?";
            this.SslCheckbox.UseVisualStyleBackColor = true;
            // 
            // SmtpPortLabel
            // 
            this.SmtpPortLabel.AutoSize = true;
            this.SmtpPortLabel.Location = new System.Drawing.Point(180, 337);
            this.SmtpPortLabel.Name = "SmtpPortLabel";
            this.SmtpPortLabel.Size = new System.Drawing.Size(32, 13);
            this.SmtpPortLabel.TabIndex = 26;
            this.SmtpPortLabel.Text = "Порт";
            // 
            // SmtpPortTextbox
            // 
            this.SmtpPortTextbox.Location = new System.Drawing.Point(183, 353);
            this.SmtpPortTextbox.Name = "SmtpPortTextbox";
            this.SmtpPortTextbox.Size = new System.Drawing.Size(142, 20);
            this.SmtpPortTextbox.TabIndex = 25;
            // 
            // SmtpServerLabel
            // 
            this.SmtpServerLabel.AutoSize = true;
            this.SmtpServerLabel.Location = new System.Drawing.Point(9, 337);
            this.SmtpServerLabel.Name = "SmtpServerLabel";
            this.SmtpServerLabel.Size = new System.Drawing.Size(76, 13);
            this.SmtpServerLabel.TabIndex = 24;
            this.SmtpServerLabel.Text = "SMTP-сервер";
            // 
            // SmtpServerTextbox
            // 
            this.SmtpServerTextbox.Location = new System.Drawing.Point(9, 353);
            this.SmtpServerTextbox.Name = "SmtpServerTextbox";
            this.SmtpServerTextbox.Size = new System.Drawing.Size(168, 20);
            this.SmtpServerTextbox.TabIndex = 23;
            // 
            // PerformPingNotifyCheckBox
            // 
            this.PerformPingNotifyCheckBox.AutoSize = true;
            this.PerformPingNotifyCheckBox.Location = new System.Drawing.Point(9, 317);
            this.PerformPingNotifyCheckBox.Name = "PerformPingNotifyCheckBox";
            this.PerformPingNotifyCheckBox.Size = new System.Drawing.Size(238, 17);
            this.PerformPingNotifyCheckBox.TabIndex = 22;
            this.PerformPingNotifyCheckBox.Text = "Выполнять пинг и отсылать уведомления";
            this.PerformPingNotifyCheckBox.UseVisualStyleBackColor = true;
            // 
            // HostsTextbox
            // 
            this.HostsTextbox.Location = new System.Drawing.Point(9, 470);
            this.HostsTextbox.Name = "HostsTextbox";
            this.HostsTextbox.Size = new System.Drawing.Size(397, 20);
            this.HostsTextbox.TabIndex = 20;
            // 
            // servicesCheckedListBox
            // 
            this.servicesCheckedListBox.FormattingEnabled = true;
            this.servicesCheckedListBox.Location = new System.Drawing.Point(6, 110);
            this.servicesCheckedListBox.Name = "servicesCheckedListBox";
            this.servicesCheckedListBox.Size = new System.Drawing.Size(401, 154);
            this.servicesCheckedListBox.TabIndex = 4;
            // 
            // servicesLabel
            // 
            this.servicesLabel.AutoSize = true;
            this.servicesLabel.Location = new System.Drawing.Point(9, 94);
            this.servicesLabel.Name = "servicesLabel";
            this.servicesLabel.Size = new System.Drawing.Size(95, 13);
            this.servicesLabel.TabIndex = 19;
            this.servicesLabel.Text = "Список сервисов";
            // 
            // ignoreInterfacesTextBox
            // 
            this.ignoreInterfacesTextBox.Location = new System.Drawing.Point(6, 71);
            this.ignoreInterfacesTextBox.Name = "ignoreInterfacesTextBox";
            this.ignoreInterfacesTextBox.Size = new System.Drawing.Size(401, 20);
            this.ignoreInterfacesTextBox.TabIndex = 17;
            // 
            // saveButton
            // 
            this.saveButton.Location = new System.Drawing.Point(12, 496);
            this.saveButton.Name = "saveButton";
            this.saveButton.Size = new System.Drawing.Size(386, 23);
            this.saveButton.TabIndex = 11;
            this.saveButton.Text = "Сохранить изменения";
            this.saveButton.UseVisualStyleBackColor = true;
            this.saveButton.Click += new System.EventHandler(this.saveButton_Click);
            // 
            // statusLabel
            // 
            this.statusLabel.AutoSize = true;
            this.statusLabel.Location = new System.Drawing.Point(9, 272);
            this.statusLabel.Name = "statusLabel";
            this.statusLabel.Size = new System.Drawing.Size(10, 13);
            this.statusLabel.TabIndex = 2;
            this.statusLabel.Text = ".";
            // 
            // ignoreInterfacesLabel
            // 
            this.ignoreInterfacesLabel.AutoSize = true;
            this.ignoreInterfacesLabel.Location = new System.Drawing.Point(9, 55);
            this.ignoreInterfacesLabel.Name = "ignoreInterfacesLabel";
            this.ignoreInterfacesLabel.Size = new System.Drawing.Size(188, 13);
            this.ignoreInterfacesLabel.TabIndex = 16;
            this.ignoreInterfacesLabel.Text = "Игнорируемые имена интерфейсов";
            // 
            // interfaceTextBox
            // 
            this.interfaceTextBox.Location = new System.Drawing.Point(68, 32);
            this.interfaceTextBox.Name = "interfaceTextBox";
            this.interfaceTextBox.Size = new System.Drawing.Size(338, 20);
            this.interfaceTextBox.TabIndex = 13;
            // 
            // InterfaceLabel
            // 
            this.InterfaceLabel.AutoSize = true;
            this.InterfaceLabel.Location = new System.Drawing.Point(65, 16);
            this.InterfaceLabel.Name = "InterfaceLabel";
            this.InterfaceLabel.Size = new System.Drawing.Size(64, 13);
            this.InterfaceLabel.TabIndex = 12;
            this.InterfaceLabel.Text = "Интерфейс";
            // 
            // portTextBox
            // 
            this.portTextBox.Location = new System.Drawing.Point(6, 32);
            this.portTextBox.Name = "portTextBox";
            this.portTextBox.Size = new System.Drawing.Size(53, 20);
            this.portTextBox.TabIndex = 10;
            // 
            // portLabel
            // 
            this.portLabel.AutoSize = true;
            this.portLabel.Location = new System.Drawing.Point(9, 16);
            this.portLabel.Name = "portLabel";
            this.portLabel.Size = new System.Drawing.Size(32, 13);
            this.portLabel.TabIndex = 9;
            this.portLabel.Text = "Порт";
            // 
            // statusLabelLabel
            // 
            this.statusLabelLabel.AutoSize = true;
            this.statusLabelLabel.Location = new System.Drawing.Point(15, 144);
            this.statusLabelLabel.Name = "statusLabelLabel";
            this.statusLabelLabel.Size = new System.Drawing.Size(0, 13);
            this.statusLabelLabel.TabIndex = 1;
            // 
            // AgentForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(422, 543);
            this.Controls.Add(this.statusLabelLabel);
            this.Controls.Add(this.configGroupBox);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Name = "AgentForm";
            this.Text = "agentconfig";
            this.configGroupBox.ResumeLayout(false);
            this.configGroupBox.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.GroupBox configGroupBox;
        private System.Windows.Forms.Button saveButton;
        private System.Windows.Forms.TextBox portTextBox;
        private System.Windows.Forms.Label portLabel;
        private System.Windows.Forms.Label statusLabelLabel;
        private System.Windows.Forms.Label statusLabel;
        private System.Windows.Forms.NotifyIcon trayIco;
        private System.Windows.Forms.TextBox interfaceTextBox;
        private System.Windows.Forms.Label InterfaceLabel;
        private System.Windows.Forms.TextBox ignoreInterfacesTextBox;
        private System.Windows.Forms.Label ignoreInterfacesLabel;
        private System.Windows.Forms.Label servicesLabel;
        private System.Windows.Forms.CheckedListBox servicesCheckedListBox;
        private System.Windows.Forms.TextBox HostsTextbox;
        private System.Windows.Forms.Label SmtpServerLabel;
        private System.Windows.Forms.TextBox SmtpServerTextbox;
        private System.Windows.Forms.CheckBox PerformPingNotifyCheckBox;
        private System.Windows.Forms.Label SubscribersLabel;
        private System.Windows.Forms.TextBox SubscribersTextBox;
        private System.Windows.Forms.Label IntervalLabel;
        private System.Windows.Forms.TextBox IntervalTextBox;
        private System.Windows.Forms.Label PasswordLabel;
        private System.Windows.Forms.Label LoginLabel;
        private System.Windows.Forms.TextBox PasswordTextBox;
        private System.Windows.Forms.TextBox LoginTextBox;
        private System.Windows.Forms.CheckBox SslCheckbox;
        private System.Windows.Forms.Label SmtpPortLabel;
        private System.Windows.Forms.TextBox SmtpPortTextbox;
        private System.Windows.Forms.Label HostsLabel;
        private System.Windows.Forms.TextBox WebCheckListTextBox;
        private System.Windows.Forms.CheckBox WebCheckBox;
        private System.Windows.Forms.CheckBox HardcoreCheckBox;
    }
}

