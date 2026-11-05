require 'set'

class Inventory
  include Enumerable
  extend Forwardable
  attr_reader :items

  MAX_ITEMS = 100

  def initialize
    @items = Set.new
    log "created"
  end

  private

  def log(message)
    Logger.info(message)
    puts message
  end
end
