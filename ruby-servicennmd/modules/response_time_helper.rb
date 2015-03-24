# encoding: utf-8
module ResponseTimeHelper
	# Измерить время отклика у массива  хостов
	def measure_response_time_urls urls
		$logger.info "Измерение времени отклика сетевых ресурсов"
		threads = [ ]
		urls.each do |url|
			threads << Thread.new do 
			end
		end
		threads.map &:join
	end
	# Измерить время отклика от веб-ресурса
	def measure_response_time url
		# Сколько раз измерять для вычисления среднего значения
		@configuration["response_time_avg_from"].times do 
			data ||= []
			start = Time.now
		end
	end

	def get_page url
		time = 0
		begin
			start = Time.now
			open(url).read
			stop = Time.now
		rescue
			nil
		end
		
	end

end