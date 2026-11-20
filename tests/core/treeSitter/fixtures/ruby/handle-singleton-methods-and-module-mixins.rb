module Loggable
  def log(message)
    puts "[LOG] #{message}"
  end
end

class Service
  include Loggable
  extend Comparable

  # Singleton method
  def self.fetch_data
    # Implementation
  end

  # Instance method
  def process
    log("Processing...")
  end
end

# Monkey patching an existing class
class String
  def palindrome?
    self == self.reverse
  end
end
