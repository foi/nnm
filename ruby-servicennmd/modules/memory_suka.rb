require "objspace"

# Вывод статистики потребления памяти
module MemorySuka
  # Numeric => количество главных прожор
	def find_top_memory_eaters n
    @results = []
    raw = { }
    ObjectSpace.each_object { |o| raw[o.object_id] = ObjectSpace.memsize_of(o) }
    sorted = raw.sort_by { |k, v| v }
    biggest = sorted[-n...-1].dup
    sorted = sorted.clear
    biggest.each do |big|
      @results << { class: ObjectSpace._id2ref(big[0]).class, size: big[1], content: ObjectSpace._id2ref(big[0]).inspect[0..100] }
    end
    return @results
  end
end
