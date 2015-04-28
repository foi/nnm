// linux_agent.go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// config
type Config struct {
	Port     int
	Services []string
}

// global variable config
var config Config

// init system
var initSystem string

// agent data
var agentData AgentData

// all response data
type AgentData struct {
	Hostname   string
	CpuLoad    int64
	Ram        Ram
	Swap       Swap
	Interfaces []NetInterface
	Disks      []Disk
	Services   []Service
}

type Ram struct {
	TotalRam int64
	UsedRam  int64
}

type Swap struct {
	TotalSize   int64
	CurrentSize int64
}

type NetInterface struct {
	Name          string
	Guid          string
	UploadSpeed   int64
	DownloadSpeed int64
}

type Disk struct {
	Name       string
	TotalSpace int64
	UsedSpace  int64
}

type Service struct {
	Name    string
	Working bool
}

func main() {
	getInitSystemType()
	// get config
	config_raw, _ := ioutil.ReadFile("./config.json")
	err_ := json.Unmarshal(config_raw, &config)
	if err_ != nil {
		fmt.Println(err_)
	}
	// start web-server
	http.HandleFunc("/", SendData)
	err := http.ListenAndServe(":"+strconv.Itoa(config.Port), nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

// заполним информацию - статистику сетевых интерфейсов
func getInterfacesData() []NetInterface {
	var interfacesData []NetInterface
	raw_interfaces_stat, _ := ioutil.ReadFile("/proc/net/dev")
	time.Sleep(1 * time.Second)
	raw_interfaces_stat_after_one_second, _ := ioutil.ReadFile("/proc/net/dev")
	parsed_string_network := parseByteArrayIntoString(raw_interfaces_stat)
	parsed_string_network_after_one_second := parseByteArrayIntoString(raw_interfaces_stat_after_one_second)
	normalized_network_string := strings.Split(parsed_string_network, "\n")
	normalized_network_string_after_one_sec := strings.Split(parsed_string_network_after_one_second, "\n")
	for i := 2; i < len(normalized_network_string)-1; i++ {
		str := normalized_network_string[i]
		str_after_one_second := normalized_network_string_after_one_sec[i]
		arr := strings.Fields(str)
		arr_after_one_second := strings.Fields(str_after_one_second)
		if arr[0] != "lo:" {
			name := arr[0][:len(arr[0])-len(":")]
			interfaceData := NetInterface{Name: name,
				Guid:          getMACfromNetAdapterName(name),
				DownloadSpeed: fromByteToKilobit(fromStringToInt64(arr_after_one_second[1]) - fromStringToInt64(arr[1])),
				UploadSpeed:   fromByteToKilobit(fromStringToInt64(arr_after_one_second[9]) - fromStringToInt64(arr[9]))}
			interfacesData = append(interfacesData, interfaceData)
		}
	}
	return interfacesData
}

// получим информацию об ОЗУ
func getMemStat(parsed []string) Ram {
	mem := Ram{}
	total_ram_in_kb := fromStringToInt64(parsed[1])
	total_available_ram_in_kb := fromStringToInt64(parsed[7])
	mem.TotalRam = (total_ram_in_kb / 1024)
	mem.UsedRam = mem.TotalRam - total_available_ram_in_kb/1024
	return mem
}

// получим информацию о своп
func getSwapStat(parsed []string) Swap {
	swap := Swap{}
	total_swap_in_kb := fromStringToInt64(parsed[43])
	total_free_swap_in_kb := fromStringToInt64(parsed[46])
	swap.TotalSize = total_swap_in_kb / 1024
	swap.CurrentSize = swap.TotalSize - (total_free_swap_in_kb / 1024)
	return swap
}

// преобразовать массив байт в массив строк
func parseByteArrayIntoArrayOfString(byte_str []byte) []string {
	normal_string := string(byte_str)
	array_of_strings := strings.Fields(normal_string)
	return array_of_strings
}

// Массив байт в строку
func parseByteArrayIntoString(byte_str []byte) string {
	normal_string := string(byte_str)
	return normal_string
}

// getMACfromNetAdapterName
// cat /sys/class/net/eth?/address
func getMACfromNetAdapterName(name string) string {
	interface_name := string(name)
	raw_mac, _ := ioutil.ReadFile("/sys/class/net/" + interface_name + "/address")
	mac := parseByteArrayIntoString(raw_mac)
	mac = strings.TrimSpace(mac)
	return mac
}

//из строки в int64
func fromStringToInt64(str string) int64 {
	result, _ := strconv.ParseInt(str, 10, 64)
	return result
}

// из байт в килобит
func fromByteToKilobit(s int64) int64 {
	result := (s / 1024) * 8
	if result == 0 {
		result = 1
	}
	return result
}

// from KB to GB
func fromKBtoGB(KB int64) int64 {
	result := (KB / 1024) / 1024
	return result
}

// пространство используемое и занятое на разделах
func getPartitionsInfo() []Disk {
	var Disks []Disk
	df_b, _ := exec.Command("df").Output()
	df_string := parseByteArrayIntoString(df_b)
	df_parsed := strings.Split(df_string, "\n")
	df_data := df_parsed[1:(len(df_parsed) - 1)]
	for i := 0; i < len(df_data)-1; i++ {
		df_fields := strings.Fields(df_data[i])
		if fromStringToInt64(df_fields[1]) > 1024000 {
			disk := Disk{Name: df_fields[5],
				TotalSpace: fromKBtoGB(fromStringToInt64(df_fields[1])),
				UsedSpace:  fromKBtoGB(fromStringToInt64(df_fields[2]))}
			Disks = append(Disks, disk)
		}
	}
	return Disks
}

// Загрузка ЦПУ
func getCpuUsage() int64 {
	idle0, total0 := getCPUSample()
	time.Sleep(1 * time.Second)
	idle1, total1 := getCPUSample()

	idleTicks := float64(idle1 - idle0)
	totalTicks := float64(total1 - total0)
	cpuUsage := 100 * (totalTicks - idleTicks) / totalTicks
	return int64(cpuUsage)

	//fmt.Printf("CPU usage is %f%% [busy: %f, total: %f]\n", cpuUsage, totalTicks-idleTicks, totalTicks)
}

// узнаем загрузку CPU - семпл - http://stackoverflow.com/questions/11356330/getting-cpu-usage-with-golang
func getCPUSample() (idle, total uint64) {
	contents, err := ioutil.ReadFile("/proc/stat")
	if err != nil {
		return
	}
	lines := strings.Split(string(contents), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if fields[0] == "cpu" {
			numFields := len(fields)
			for i := 1; i < numFields; i++ {
				val, err := strconv.ParseUint(fields[i], 10, 64)
				if err != nil {
					fmt.Println("Error: ", i, fields[i], err)
				}
				total += val // tally up all the numbers to get total ticks
				if i == 4 {  // idle is the 5th field in the cpu line
					idle = val
				}
			}
			return
		}
	}
	return
}

// check status of processes
func getInitSystemType() {
	// check init system
	output, _err := os.Readlink("/sbin/init")
	if _err != nil {
		fmt.Println(_err)
	}
	if strings.Contains(output, "upstart") {
		initSystem = "upstart"
	} else if strings.Contains(output, "systemd") {
		initSystem = "systemd"
	} else {
		initSystem = "sysv"
	}
}

// check service statuses
func checkServiceStatuses() {
	agentData.Services = nil
	for _, serviceName := range config.Services {
		if initSystem == "upstart" {
			raw_service_st, err := exec.Command("service", serviceName, "status").Output()
			if err != nil {
				fmt.Println("ERROR:", err)
			} else {
				parsed_service_st := parseByteArrayIntoString(raw_service_st)
				fmt.Println(parsed_service_st)
			}
		} else if initSystem == "systemd" {
			raw_service_st, err := exec.Command("systemctl", "status", serviceName).Output()
			parsed_service_st := parseByteArrayIntoString(raw_service_st)
			normalized := splitIntoArrayByNewline(parsed_service_st)
			if err != nil {
				fmt.Println("ERROR:", err, parseByteArrayIntoString(raw_service_st))
				if strings.Contains(normalized[2], "inactive") {
					agentData.Services = append(agentData.Services, Service{Name: serviceName, Working: false})
				}
			} else {
				if strings.Contains(normalized[2], "running") {
					agentData.Services = append(agentData.Services, Service{Name: serviceName, Working: true})
				}
			}
		}
	}
}

// разбить на массив по \n
func splitIntoArrayByNewline(str string) []string {
	return strings.Split(str, "\n")
}

// Все что нужно для веб-сервера
func SendData(w http.ResponseWriter, req *http.Request) {
	raw_mem_info, _ := ioutil.ReadFile("/proc/meminfo")
	parsed_mem_and_swap := parseByteArrayIntoArrayOfString(raw_mem_info)
	mem := getMemStat(parsed_mem_and_swap)
	swap := getSwapStat(parsed_mem_and_swap)
	agentData.Hostname, _ = os.Hostname()
	agentData.CpuLoad = getCpuUsage()
	agentData.Ram.TotalRam = mem.TotalRam
	agentData.Ram.UsedRam = mem.UsedRam
	agentData.Swap.TotalSize = swap.TotalSize
	agentData.Swap.CurrentSize = swap.CurrentSize
	agentData.Interfaces = getInterfacesData()
	agentData.Disks = getPartitionsInfo()
	checkServiceStatuses()
	response, _ := json.Marshal(agentData)
	io.WriteString(w, string(response))
}
