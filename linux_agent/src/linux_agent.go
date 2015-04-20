// test1 project main.go
package main

import (
	"fmt"
	"io/ioutil"
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

type NetInterfaces []NetInterface

func main() {
	mem := new(Ram)
	swap := new(Swap)
	//interfaces := new(NetInterfaces)
	raw_mem_info, err := ioutil.ReadFile("/proc/meminfo")
	if err != nil {
		fmt.Println(err)
	}
	// считываем информацию об интерфейсах
	raw_interfaces_stat, err := ioutil.ReadFile("/proc/net/dev")

	parsed_string_ram := parseByteArrayIntoArrayOfString(raw_mem_info)
	parsed_string_network := parseByteArrayIntoArrayOfString(raw_interfaces_stat)

	getMemStat(parsed_string_ram, mem)   // выбираем ОЗУ
	getSwapStat(parsed_string_ram, swap) // выбираем своп

	fmt.Printf("Total RAM %v \n Used Ram %v \n Total Swap %v \n Used Swap %v \n Govno %v ",
		mem.TotalRam,
		mem.UsedRam,
		swap.TotalSize,
		swap.CurrentSize,
		len(parsed_string_network))

	for i := 20; i <= (len(parsed_string_network) - 1); i++ {
		if i == 20 || i == 37 || i == 54 || i == 71 || i == 88 || i == 105 {
			first_down := fromStringToInt64(parsed_string_network[i+1])
			first_up := fromStringToInt64(parsed_string_network[i+9])
			time.Sleep(1 * time.Second)
			downloadSpeed := (fromStringToInt64(parsed_string_network[i+1]) - first_down) * 8
			fmt.Println(downloadSpeed)
			uploadSpeed := (fromStringToInt64(parsed_string_network[i+9]) - first_up) * 8
			netInt := NetInterface{Name: parsed_string_network[i], Guid: "", DownloadSpeed: downloadSpeed, UploadSpeed: uploadSpeed}
			fmt.Println(netInt.UploadSpeed)
		}
	}
	for index, element := range parsed_string_network {
		//fmt.Printf("%v - %v;", index, element)
		if index >= 20 {
			if index == 20 || index == 37 || index == 54 || index == 71 || index == 88 {
				//netInt := new(NetInterface){element, }
				fmt.Println(element)
			}

		}
	}
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

// getMACfromNetAdapterName
// cat /sys/class/net/eth?/address
func getMACfromNetAdapterName(name string) string {
	return "hello"
}

//из строки в int64
func fromStringToInt64(str string) int64 {
	result, err := strconv.ParseInt(str, 0, 64)
	if err != nil {
		fmt.Println(err)
	}
	return result
}
