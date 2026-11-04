# User module for handling user-related functionality
module User
  # Constants for user status
  ACTIVE = 1
  INACTIVE = 0

  # Person class represents a human user
  class Person
    attr_accessor :name, :age

    # Initialize a new person
    # @param name [String] the person's name
    # @param age [Integer] the person's age
    def initialize(name, age)
      @name = name
      @age = age
    end

    # Return a greeting
    # @return [String] a personalized greeting
    def greet
      "Hello, I'm #{@name} and I'm #{@age} years old!"
    end

    # A class method to create a Person
    def self.create(name, age)
      new(name, age)
    end
  end

  # Create a module method
  def self.find_by_name(name)
    # Implementation
  end
end

# Include external libraries
require 'json'
require_relative './helpers'

# Create a user and greet
person = User::Person.new("John", 30)
puts person.greet
