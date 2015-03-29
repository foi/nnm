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
            this.configGroupBox.Location = new System.Drawing.Point(12, 12);
            this.configGroupBox.Name = "configGroupBox";
            this.configGroupBox.Size = new System.Drawing.Size(332, 535);
            this.configGroupBox.TabIndex = 0;
            this.configGroupBox.TabStop = false;
            this.configGroupBox.Text = "Конфигурация";
            // 
            // servicesCheckedListBox
            // 
            this.servicesCheckedListBox.FormattingEnabled = true;
            this.servicesCheckedListBox.Location = new System.Drawing.Point(6, 110);
            this.servicesCheckedListBox.Name = "servicesCheckedListBox";
            this.servicesCheckedListBox.Size = new System.Drawing.Size(320, 394);
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
            this.ignoreInterfacesTextBox.Size = new System.Drawing.Size(320, 20);
            this.ignoreInterfacesTextBox.TabIndex = 17;
            // 
            // saveButton
            // 
            this.saveButton.Location = new System.Drawing.Point(12, 506);
            this.saveButton.Name = "saveButton";
            this.saveButton.Size = new System.Drawing.Size(309, 23);
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
            this.interfaceTextBox.Size = new System.Drawing.Size(258, 20);
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
            this.ClientSize = new System.Drawing.Size(349, 553);
            this.Controls.Add(this.statusLabelLabel);
            this.Controls.Add(this.configGroupBox);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Name = "AgentForm";
            this.Text = "agentconfig3";
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
    }
}

