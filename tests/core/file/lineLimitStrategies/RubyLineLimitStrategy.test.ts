import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { RubyLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/RubyLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('RubyLineLimitStrategy', () => {
  let strategy: RubyLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new RubyLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('ruby');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify require statements and module declarations', () => {
      const lines = [
        'require "json"',
        'require "net/http"',
        'require_relative "../models/user"',
        '',
        'module UserService',
        'module HttpServer',
        '',
        'class ApplicationController',
        '  # Controller logic here',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // require "json"
      expect(headerLines).toContain(1); // require "net/http"
      expect(headerLines).toContain(2); // require_relative
      expect(headerLines).toContain(4); // module UserService
      expect(headerLines).toContain(5); // module HttpServer
      expect(headerLines).toContain(7); // class ApplicationController
    });

    test('should identify class and module definitions', () => {
      const lines = [
        'require "active_support"',
        '',
        'class User',
        '  include ActiveModel::Model',
        '  include ActiveModel::Attributes',
        '  ',
        '  attr_accessor :id, :name, :email',
        '  attr_reader :created_at, :updated_at',
        '  ',
        '  validates :name, presence: true',
        '  validates :email, format: { with: URI::MailTo::REGEX }',
        'end',
        '',
        'module Api',
        '  module V1',
        '    class UserService',
        '      def initialize(api_key)',
        '        @api_key = api_key',
        '      end',
        '    end',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // require
      expect(headerLines).toContain(2); // class User
      expect(headerLines).toContain(3); // include ActiveModel::Model
      expect(headerLines).toContain(4); // include ActiveModel::Attributes
      expect(headerLines).toContain(6); // attr_accessor
      expect(headerLines).toContain(7); // attr_reader
      expect(headerLines).toContain(9); // validates
      expect(headerLines).toContain(12); // module Api
      expect(headerLines).toContain(13); // module V1
      expect(headerLines).toContain(14); // class UserService
    });

    test('should identify constants and class variables', () => {
      const lines = [
        'require "yaml"',
        '',
        'module Config',
        '  API_VERSION = "1.0.0"',
        '  API_BASE_URL = "https://api.example.com"',
        '  ',
        '  class << self',
        '    def default_config',
        '      {',
        '        timeout: 30,',
        '        retries: 3,',
        '        debug: false',
        '      }',
        '    end',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // require
      expect(headerLines).toContain(2); // module Config
      expect(headerLines).toContain(3); // API_VERSION
      expect(headerLines).toContain(4); // API_BASE_URL
      expect(headerLines).toContain(7); // class << self
      expect(headerLines).toContain(8); // def default_config
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze method definitions', () => {
      const lines = [
        'class UserService',
        '  def simple_method',
        '    "simple result"',
        '  end',
        '  ',
        '  def complex_method(param)',
        '    if param > 0',
        '      (1..param).each do |i|',
        '        if i.even?',
        '          begin',
        '            return process_even(i)',
        '          rescue => StandardError',
        '            return -1',
        '          end',
        '        end',
        '      end',
        '    end',
        '    param',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const simpleMethod = functions.find((f) => f.name === 'simple_method');
      expect(simpleMethod).toBeDefined();
      expect(simpleMethod!.complexity).toBeLessThan(0.5);

      const complexMethod = functions.find((f) => f.name === 'complex_method');
      expect(complexMethod).toBeDefined();
      expect(complexMethod!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze class methods with access modifiers', () => {
      const lines = [
        'class UserService',
        '  def initialize(repository)',
        '    @repository = repository',
        '  end',
        '  ',
        '  public def get_user(id)',
        '    @repository.find(id)',
        '  end',
        '  ',
        '  private def validate_user(user)',
        '    user.present? && user.valid?',
        '  end',
        '  ',
        '  protected def log_access(user)',
        '    Rails.logger.info("User accessed: #{user.id}")',
        '  end',
        '  ',
        '  class << self',
        '    def create_user(attributes)',
        '      new(attributes)',
        '    end',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(5);

      const initialize = functions.find((f) => f.name === 'initialize');
      expect(initialize).toBeDefined();

      const getUser = functions.find((f) => f.name === 'get_user');
      expect(getUser).toBeDefined();

      const validateUser = functions.find((f) => f.name === 'validate_user');
      expect(validateUser).toBeDefined();
      expect(validateUser!.complexity).toBeGreaterThan(0.5); // Should account for conditional

      const logAccess = functions.find((f) => f.name === 'log_access');
      expect(logAccess).toBeDefined();

      const createUser = functions.find((f) => f.name === 'create_user');
      expect(createUser).toBeDefined();
      expect(createUser!.complexity).toBeGreaterThan(0.5); // Should account for class method
    });

    test('should analyze singleton methods and class methods', () => {
      const lines = [
        'class Database',
        '  @@instance = nil',
        '  @@mutex = Mutex.new',
        '  ',
        '  def self.instance',
        '    return @@instance ||= new',
        '  end',
        '  ',
        '  def initialize',
        '    @connection = connect_to_database',
        '  end',
        '  ',
        '  def with_connection',
        '    @@mutex.synchronize do',
        '      yield @connection if block_given?',
        '    end',
        '  end',
        '  ',
        '  def self.connect',
        '    new.connect',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const instance = functions.find((f) => f.name === 'instance');
      expect(instance).toBeDefined();

      const initialize = functions.find((f) => f.name === 'initialize');
      expect(initialize).toBeDefined();

      const withConnection = functions.find((f) => f.name === 'with_connection');
      expect(withConnection).toBeDefined();
      expect(withConnection!.complexity).toBeGreaterThan(0.5); // Should account for synchronize

      const connect = functions.find((f) => f.name === 'connect');
      expect(connect).toBeDefined();
      expect(connect!.complexity).toBeGreaterThan(0.5); // Should account for class method
    });

    test('should analyze module functions', () => {
      const lines = [
        'module MathUtils',
        '  def self.add(a, b)',
        '    a + b',
        '  end',
        '  ',
        '  def self.multiply(a, b)',
        '    a * b',
        '  end',
        '  ',
        '  def self.factorial(n)',
        '    return 1 if n <= 1',
        '    n * self.factorial(n - 1)',
        '  end',
        '  ',
        '  def self.fibonacci(n)',
        '    return n if n <= 1',
        '    self.fibonacci(n - 1) + self.fibonacci(n - 2)',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const add = functions.find((f) => f.name === 'add');
      expect(add).toBeDefined();

      const multiply = functions.find((f) => f.name === 'multiply');
      expect(multiply).toBeDefined();

      const factorial = functions.find((f) => f.name === 'factorial');
      expect(factorial).toBeDefined();
      expect(factorial!.complexity).toBeGreaterThan(0.5); // Should account for recursion

      const fibonacci = functions.find((f) => f.name === 'fibonacci');
      expect(fibonacci).toBeDefined();
      expect(fibonacci!.complexity).toBeGreaterThan(0.5); // Should account for recursion
    });

    test('should analyze block methods and procs', () => {
      const lines = [
        'class DataProcessor',
        '  def process_data(data)',
        '    processed = data.map do |item|',
        '      case item',
        '      when String',
        '        item.strip',
        '      when Integer',
        '        item * 2',
        '      when Array',
        '        item.sum',
        '      else',
        '        item.to_s',
        '      end',
        '    end',
        '    processed',
        '  end',
        '  ',
        '  def process_with_proc',
        '    processor = proc do |x, y|',
        '      x + y',
        '    end',
        '    ',
        '    data.map { |item| processor.call(item, 1) }',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const processData = functions.find((f) => f.name === 'process_data');
      expect(processData).toBeDefined();
      expect(processData!.complexity).toBeGreaterThan(0.5); // Should account for case/when

      const processWithProc = functions.find((f) => f.name === 'process_with_proc');
      expect(processWithProc).toBeDefined();
      expect(processWithProc!.complexity).toBeGreaterThan(0.5); // Should account for proc
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main execution block', () => {
      const lines = [
        'require "json"',
        '',
        'class Application',
        '  def initialize(config)',
        '    @config = config',
        '  end',
        '  ',
        '  def run',
        '    puts "Starting application..."',
        '    if ARGV.length > 0',
        '      process_arguments(ARGV)',
        '    else',
        '      run_default_behavior',
        '    end',
        '    puts "Application finished"',
        '  end',
        '  ',
        '  private',
        '  def process_arguments(args)',
        '    args.each { |arg| puts "Argument: #{arg}" }',
        '  end',
        '  ',
        '  def run_default_behavior',
        '    puts "Running with default behavior"',
        '  end',
        'end',
        '',
        '# Main execution',
        'app = Application.new(load_config)',
        'app.run',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(24); // # Main execution
      expect(footerLines).toContain(25); // app = Application.new
      expect(footerLines).toContain(26); // app.run
    });

    test('should identify module-level code at end', () => {
      const lines = [
        'module ConfigLoader',
        '  def self.load_from_file(filename)',
        '    File.read(filename)',
        '  rescue Errno::ENOENT',
        '    puts "Config file not found: #{filename}"',
        '    exit 1',
        '  rescue => e',
        '    puts "Error reading config: #{e.message}"',
        '    exit 1',
        '  end',
        '  end',
        'end',
        '',
        '# Configuration loading',
        'config = ConfigLoader.load_from_file("config.yml")',
        'puts "Configuration loaded successfully"',
        'puts "Debug mode: #{config[:debug]}" if config[:debug]',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(18); // # Configuration loading
      expect(footerLines).toContain(19); // config = ConfigLoader.load_from_file
      expect(footerLines).toContain(20); // puts "Configuration loaded successfully"
      expect(footerLines).toContain(21); // puts "Debug mode"
    });

    test('should identify test code at the end', () => {
      const lines = [
        'require "minitest/autorun"',
        '',
        'class TestUserService',
        '  def setup',
        '    @service = UserService.new',
        '  end',
        '  ',
        '  def test_create_user',
        '    user = @service.create_user(name: "Test User")',
        '    assert user.persisted?',
        '    assert_equal "Test User", user.name',
        '  end',
        '  ',
        '  def teardown',
        '    @service.cleanup if @service',
        '  end',
        'end',
        '',
        '# Test execution',
        'if __FILE__ == $PROGRAM_NAME',
        '  MiniTest.run',
        'else',
        '  puts "Run this file with: ruby #{__FILE__}"',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(20); // # Test execution
      expect(footerLines).toContain(21); // if __FILE__ == $PROGRAM_NAME
      expect(footerLines).toContain(22); // MiniTest.run
      expect(footerLines).toContain(23); // else
      expect(footerLines).toContain(24); // puts
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = [
        'class SimpleClass',
        '  def simple_method',
        '    "simple result"',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        'class ComplexClass',
        '  def complex_method(param)',
        '    if param > 0',
        '      (1..param).each do |i|',
        '        if i.even?',
        '          begin',
        '            return process_even(i)',
        '          rescue => StandardError',
        '            return -1',
        '          end',
        '        elsif param < 0',
        '          while param.abs > 0',
        '            param += 1',
        '          end',
        '        else',
        '          case param',
        '          when 1..10',
        '            param * 2',
        '          when 11..20',
        '            param * 3',
        '          else',
        '            param',
        '          end',
        '        end',
        '      end',
        '    end',
        '    param',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for blocks and exception handling', () => {
      const lines = [
        'class ExceptionHandler',
        '  def safe_operation',
        '    begin',
        '      result = risky_operation',
        '      rescue => StandardError => e',
        '        log_error("Standard error: #{e.message}")',
        '        return nil',
        '      rescue => Timeout::Error => e',
        '        log_error("Timeout error: #{e.message}")',
        '        return nil',
        '      rescue => e',
        '        log_error("Unexpected error: #{e.class} - #{e.message}")',
        '        return nil',
        '      ensure',
        '        cleanup_resources',
        '      end',
        '    end',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to begin/rescue/ensure
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for metaprogramming and blocks', () => {
      const lines = [
        'class MetaProcessor',
        '  def process_with_block',
        '    data.map do |item|',
        '      item.tap do |x|',
        '        x.processed = true',
        '      end',
        '    end',
        '  end',
        '  ',
        '  def process_with_yield',
        '    (1..10).each do |i|',
        '      yield i * 2 if i.even?',
        '    end',
        '  end',
        '  ',
        '  def process_with_enum',
        '    data.each_with_object({}) do |item, index|',
        "      puts \"Processing #{index}: #{item}\"",
        '    end',
        '  end',
        'end',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to blocks, tap, yield, each_with_object
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        'require "json"',
        'require "net/http"',
        'class UserService',
        '  def initialize',
        '    @users = []',
        '  end',
        'end',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // require
      expect(headerLines).toContain(1); // require
      expect(headerLines).toContain(2); // class UserService
      expect(headerLines).toContain(3); // def initialize
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'class TestClass',
        '  def simple_method',
        '    "simple"',
        '  end',
        '  ',
        '  def complex_method(param)',
        '    if param > 0',
        '      (1..param).each { |i| puts i }',
        '    end',
        '    param',
        '  end',
        'end',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const simpleMethod = functions.find((f) => f.name === 'simple_method');
      expect(simpleMethod).toBeDefined();

      const complexMethod = functions.find((f) => f.name === 'complex_method');
      expect(complexMethod).toBeDefined();
      expect(complexMethod!.complexity).toBeGreaterThan(0.5);
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'require "json"',
        'class Application',
        '  def run',
        '    puts "Running..."',
        '  end',
        'end',
        '',
        'app = Application.new',
        'app.run',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(9); // app = Application.new
      expect(footerLines).toContain(10); // app.run
    });
  });
});