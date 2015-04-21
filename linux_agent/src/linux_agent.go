// test1 project main.go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type AgentData struct {
	Hostname   string
	CpuLoad    int64
	Ram        Ram
	Swap       Swap
	Interfaces []NetInterface
	Disks      []Disk
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

//type NetInterfaces []NetInterface

func main() {
	ttt := time.April
	ttt = ttt
	sss := strings.ToLower("sss")
	sss = sss
	http.HandleFunc("/", SendData)
	err := http.ListenAndServe(":9998", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
	mem := new(Ram)
	swap := new(Swap)
	//interfaces := new(NetInterfaces)
	//raw_mem_info, err := ioutil.ReadFile("/proc/meminfo")
	if err != nil {
		fmt.Println(err)
	}
	// получаем имя хоста
	//hostname := getHostname()
	//fmt.Println(hostname)
	Disks := getPartitionsInfo()
	fmt.Println(Disks)
	// считываем информацию об интерфейсах
	//	raw_interfaces_stat, err := ioutil.ReadFile("/proc/net/dev")
	//	time.Sleep(1 * time.Second)
	//	raw_interfaces_stat_after_one_second, err := ioutil.ReadFile("/proc/net/dev")

	//parsed_string_ram := parseByteArrayIntoArrayOfString(raw_mem_info)
	//	parsed_string_network := parseByteArrayIntoString(raw_interfaces_stat)
	//	parsed_string_network_after_one_second := parseByteArrayIntoString(raw_interfaces_stat_after_one_second)
	//	normalized_network_string := strings.Split(parsed_string_network, "\n")

	//	normalized_network_string_after_one_sec := strings.Split(parsed_string_network_after_one_second, "\n")

	//getMemStat(parsed_string_ram, mem)   // выбираем ОЗУ
	//getSwapStat(parsed_string_ram, swap) // выбираем своп

	//CpuLoad := getCpuUsage()
	//fmt.Println(CpuLoad)
	//var interfacesData []NetInterface
	//interfacesData = getInterfacesData(interfacesData, normalized_network_string, normalized_network_string_after_one_sec)
	//fmt.Println(interfacesData)
	fmt.Printf("Total RAM %v \n Used Ram %v \n Total Swap %v \n Used Swap %v \n Network: %v",
		mem.TotalRam,
		mem.UsedRam,
		swap.TotalSize,
		swap.CurrentSize,
		1)

}

// заполним информацию - статистику сетевых интерфейсов
//func getInterfacesData(interfacesData []NetInterface, normalized_network_string []string, normalized_network_string_after_one_sec []string) []NetInterface {

//	for i := 2; i < len(normalized_network_string)-1; i++ {
//		str := normalized_network_string[i]
//		str_after_one_second := normalized_network_string_after_one_sec[i]
//		arr := strings.Fields(str)
//		arr_after_one_second := strings.Fields(str_after_one_second)
//		if arr[0] != "lo:" {
//			name := arr[0][:len(arr[0])-len(":")]
//			interfaceData := NetInterface{Name: name,
//				Guid:          getMACfromNetAdapterName(name),
//				DownloadSpeed: fromByteToKilobit(fromStringToInt64(arr_after_one_second[1]) - fromStringToInt64(arr[1])),
//				UploadSpeed:   fromByteToKilobit(fromStringToInt64(arr_after_one_second[9]) - fromStringToInt64(arr[9]))}
//			interfacesData = append(interfacesData, interfaceData)
//		}
//	}
//	return interfacesData
//}
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
//func getMemStat(parsed []string, mem *Ram) {
//	total_ram_in_kb, err := strconv.ParseInt(parsed[1], 0, 64)
//	total_available_ram_in_kb, err := strconv.ParseInt(parsed[7], 0, 64)
//	if err != nil {
//		fmt.Println(err)
//	}
//	mem.TotalRam = (total_ram_in_kb / 1024)
//	mem.UsedRam = mem.TotalRam - total_available_ram_in_kb/1024
//}
func getMemStat(parsed []string) Ram {
	mem := Ram{}
	total_ram_in_kb := fromStringToInt64(parsed[1])
	total_available_ram_in_kb := fromStringToInt64(parsed[7])
	mem.TotalRam = (total_ram_in_kb / 1024)
	mem.UsedRam = mem.TotalRam - total_available_ram_in_kb/1024
	return mem
}

// получим информацию о своп
//func getSwapStat(parsed []string, swap *Swap) {
//	total_swap_in_kb, err := strconv.ParseInt(parsed[43], 0, 64)
//	total_free_swap_in_kb, err := strconv.ParseInt(parsed[46], 0, 64)
//	if err != nil {
//		fmt.Println(err)
//	}
//	swap.TotalSize = total_swap_in_kb / 1024
//	swap.CurrentSize = swap.TotalSize - (total_free_swap_in_kb / 1024)
//}
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

// получить hostname
func getHostname() string {
	hostname, _ := ioutil.ReadFile("/proc/sys/kernel/hostname")
	return parseByteArrayIntoString(hostname)
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

// получить данные о своп и РАМ
func getSwapAndRamData() {

}

// Все что нужно для веб-сервера
func SendData(w http.ResponseWriter, req *http.Request) {
	agentData := &AgentData{}

	raw_mem_info, _ := ioutil.ReadFile("/proc/meminfo")
	parsed_mem_and_swap := parseByteArrayIntoArrayOfString(raw_mem_info)
	mem := getMemStat(parsed_mem_and_swap)
	swap := getSwapStat(parsed_mem_and_swap)
	agentData.Hostname = getHostname()
	agentData.CpuLoad = getCpuUsage()
	agentData.Ram.TotalRam = mem.TotalRam
	agentData.Ram.UsedRam = mem.UsedRam
	agentData.Swap.TotalSize = swap.TotalSize
	agentData.Swap.CurrentSize = swap.CurrentSize
	agentData.Interfaces = getInterfacesData()
	agentData.Disks = getPartitionsInfo()
	response, _ := json.Marshal(agentData)
	io.WriteString(w, string(response))
}
