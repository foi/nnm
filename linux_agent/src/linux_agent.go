// test1 project main.go
package main

import (
	"fmt"
	"io/ioutil"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

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
	mem := new(Ram)
	swap := new(Swap)
	//interfaces := new(NetInterfaces)
	raw_mem_info, err := ioutil.ReadFile("/proc/meminfo")
	if err != nil {
		fmt.Println(err)
	}
	// получаем имя хоста
	hostname := getHostname()
	fmt.Println(hostname)
	Disks := getPartitionsInfo()
	fmt.Println(Disks)
	// считываем информацию об интерфейсах
	raw_interfaces_stat, err := ioutil.ReadFile("/proc/net/dev")
	time.Sleep(1 * time.Second)
	raw_interfaces_stat_after_one_second, err := ioutil.ReadFile("/proc/net/dev")

	parsed_string_ram := parseByteArrayIntoArrayOfString(raw_mem_info)
	parsed_string_network := parseByteArrayIntoString(raw_interfaces_stat)
	parsed_string_network_after_one_second := parseByteArrayIntoString(raw_interfaces_stat_after_one_second)
	normalized_network_string := strings.Split(parsed_string_network, "\n")

	normalized_network_string_after_one_sec := strings.Split(parsed_string_network_after_one_second, "\n")

	getMemStat(parsed_string_ram, mem)   // выбираем ОЗУ
	getSwapStat(parsed_string_ram, swap) // выбираем своп

	fmt.Printf("Total RAM %v \n Used Ram %v \n Total Swap %v \n Used Swap %v ",
		mem.TotalRam,
		mem.UsedRam,
		swap.TotalSize,
		swap.CurrentSize)
	var interfacesData []NetInterface
	interfacesData = getInterfacesData(interfacesData, normalized_network_string, normalized_network_string_after_one_sec)
	fmt.Println(interfacesData)
}

// заполним информацию - статистику сетевых интерфейсов
func getInterfacesData(interfacesData []NetInterface, normalized_network_string []string, normalized_network_string_after_one_sec []string) []NetInterface {
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
func getMemStat(parsed []string, mem *Ram) {
	total_ram_in_kb, err := strconv.ParseInt(parsed[1], 0, 64)
	total_available_ram_in_kb, err := strconv.ParseInt(parsed[7], 0, 64)
	if err != nil {
		fmt.Println(err)
	}
	mem.TotalRam = (total_ram_in_kb / 1024)
	mem.UsedRam = mem.TotalRam - total_available_ram_in_kb/1024
}

// получим информацию о своп
func getSwapStat(parsed []string, swap *Swap) {
	total_swap_in_kb, err := strconv.ParseInt(parsed[43], 0, 64)
	total_free_swap_in_kb, err := strconv.ParseInt(parsed[46], 0, 64)
	if err != nil {
		fmt.Println(err)
	}
	swap.TotalSize = total_swap_in_kb / 1024
	swap.CurrentSize = swap.TotalSize - (total_free_swap_in_kb / 1024)
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
