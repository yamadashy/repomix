import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { CSharpLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/CSharpLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('CSharpLineLimitStrategy', () => {
  let strategy: CSharpLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new CSharpLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('c_sharp');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify using statements and namespace declarations', () => {
      const lines = [
        'using System;',
        'using System.Collections.Generic;',
        'using System.Linq;',
        'using System.Threading.Tasks;',
        'using Microsoft.Extensions.Logging;',
        '',
        'namespace MyApp.Services {',
        '    public class UserService {',
        '        private readonly ILogger<UserService> _logger;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // using System
      expect(headerLines).toContain(1); // using System.Collections.Generic
      expect(headerLines).toContain(2); // using System.Linq
      expect(headerLines).toContain(3); // using System.Threading.Tasks
      expect(headerLines).toContain(4); // using Microsoft.Extensions.Logging
      expect(headerLines).toContain(6); // namespace MyApp.Services
      expect(headerLines).toContain(7); // public class UserService
    });

    test('should identify attributes and interfaces', () => {
      const lines = [
        'using System;',
        '',
        '[ApiController]',
        '[Route("api/[controller]")',
        'public class UsersController : ControllerBase {',
        '    private readonly IUserService _userService;',
        '}',
        '',
        'public interface IUserService {',
        '    Task<User> GetUserAsync(int id);',
        '    Task<List<User>> GetAllUsersAsync();',
        '}',
        '',
        '[Serializable]',
        'public class User {',
        '    [JsonProperty("id")]',
        '    public int Id { get; set; }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // using System
      expect(headerLines).toContain(2); // [ApiController]
      expect(headerLines).toContain(3); // [Route]
      expect(headerLines).toContain(4); // public class UsersController
      expect(headerLines).toContain(8); // public interface IUserService
      expect(headerLines).toContain(13); // [Serializable]
      expect(headerLines).toContain(14); // public class User
      expect(headerLines).toContain(15); // [JsonProperty]
    });

    test('should identify enums and delegates', () => {
      const lines = [
        'using System;',
        '',
        'public enum Status {',
        '    Active = 1,',
        '    Inactive = 2,',
        '    Pending = 3',
        '}',
        '',
        'public delegate void EventHandler(object sender, EventArgs e);',
        '',
        'public delegate TResult Func<T, TResult>(T arg);',
        '',
        'public class EventManager {',
        '    public event EventHandler OnEvent;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // using System
      expect(headerLines).toContain(2); // public enum Status
      expect(headerLines).toContain(8); // public delegate void EventHandler
      expect(headerLines).toContain(10); // public delegate TResult Func
      expect(headerLines).toContain(12); // public class EventManager
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze method declarations', () => {
      const lines = [
        'public class UserService {',
        '    public User GetUser(int id) {',
        '        return _repository.FindById(id);',
        '    }',
        '',
        '    public async Task<List<User>> GetAllUsersAsync() {',
        '        if (_cache.Count > 100) {',
        '            for (int i = 0; i < 10; i++) {',
        '                if (i % 2 == 0) {',
        '                    try {',
        '                        return await _repository.FindTop10Async();',
        '                    } catch (Exception ex) {',
        '                        return new List<User>();',
        '                    }',
        '                }',
        '            }',
        '        }',
        '        return await _repository.FindAllAsync();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const getUser = functions.find((f) => f.name === 'GetUser');
      expect(getUser).toBeDefined();
      expect(getUser!.complexity).toBeLessThan(0.5);

      const getAllUsers = functions.find((f) => f.name === 'GetAllUsersAsync');
      expect(getAllUsers).toBeDefined();
      expect(getAllUsers!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze constructors and properties', () => {
      const lines = [
        'public class User {',
        '    public int Id { get; set; }',
        '    public string Name { get; set; }',
        '    public DateTime CreatedAt { get; set; }',
        '',
        '    public User() {',
        '        CreatedAt = DateTime.UtcNow;',
        '    }',
        '',
        '    public User(int id, string name) {',
        '        Id = id;',
        '        Name = name ?? "Unknown";',
        '        CreatedAt = DateTime.UtcNow;',
        '    }',
        '',
        '    [JsonConstructor]',
        '    public User(JsonObject json) {',
        '        Id = json["id"];',
        '        Name = json["name"];',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const defaultConstructor = functions.find((f) => f.name === 'User' && f.lineCount <= 4);
      expect(defaultConstructor).toBeDefined();

      const parameterizedConstructor = functions.find((f) => f.name === 'User' && f.lineCount > 4 && f.lineCount <= 8);
      expect(parameterizedConstructor).toBeDefined();

      const jsonConstructor = functions.find((f) => f.name === 'User' && f.lineCount > 8);
      expect(jsonConstructor).toBeDefined();
    });

    test('should analyze interface methods', () => {
      const lines = [
        'public interface IUserService {',
        '    User GetUser(int id);',
        '',
        '    Task<List<User>> GetAllUsers();',
        '',
        '    Task<User> CreateUserAsync(User user);',
        '',
        '    Task<bool> DeleteUserAsync(int id);',
        '',
        '    Task<User> UpdateUserAsync(int id, User user);',
        '}',
        '',
        'public interface IRepository<T> {',
        '    T FindById(int id);',
        '    Task<List<T>> FindAllAsync();',
        '    Task<T> AddAsync(T entity);',
        '    Task<T> UpdateAsync(T entity);',
        '    Task<bool> DeleteAsync(int id);',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(10);

      const getUser = functions.find((f) => f.name === 'GetUser');
      expect(getUser).toBeDefined();

      const getAllUsers = functions.find((f) => f.name === 'GetAllUsers');
      expect(getAllUsers).toBeDefined();

      const createUserAsync = functions.find((f) => f.name === 'CreateUserAsync');
      expect(createUserAsync).toBeDefined();
      expect(createUserAsync!.complexity).toBeGreaterThan(0.5); // Should account for Task

      const deleteUserAsync = functions.find((f) => f.name === 'DeleteUserAsync');
      expect(deleteUserAsync).toBeDefined();
      expect(deleteUserAsync!.complexity).toBeGreaterThan(0.5); // Should account for Task

      const updateUserAsync = functions.find((f) => f.name === 'UpdateUserAsync');
      expect(updateUserAsync).toBeDefined();
      expect(updateUserAsync!.complexity).toBeGreaterThan(0.5); // Should account for Task
    });

    test('should analyze static and generic methods', () => {
      const lines = [
        'public class MathUtils {',
        '    public static int Add(int a, int b) {',
        '        return a + b;',
        '    }',
        '',
        '    public static double Multiply(double a, double b) {',
        '        return a * b;',
        '    }',
        '',
        '    public bool IsPositive<T>(T value) where T : IComparable<T> {',
        '        return value.CompareTo(default(T)) > 0;',
        '    }',
        '',
        '    public T Max<T>(T a, T b) where T : IComparable<T> {',
        '        return a.CompareTo(b) > 0 ? a : b;',
        '    }',
        '',
        '    public TResult Map<T, TResult>(IEnumerable<T> source, Func<T, TResult> selector) {',
        '        return source.Select(selector).ToList();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(5);

      const add = functions.find((f) => f.name === 'Add');
      expect(add).toBeDefined();

      const multiply = functions.find((f) => f.name === 'Multiply');
      expect(multiply).toBeDefined();

      const isPositive = functions.find((f) => f.name === 'IsPositive');
      expect(isPositive).toBeDefined();
      expect(isPositive!.complexity).toBeGreaterThan(0.5); // Should account for generic constraint

      const max = functions.find((f) => f.name === 'Max');
      expect(max).toBeDefined();
      expect(max!.complexity).toBeGreaterThan(0.5); // Should account for generic constraint

      const map = functions.find((f) => f.name === 'Map');
      expect(map).toBeDefined();
      expect(map!.complexity).toBeGreaterThan(0.5); // Should account for LINQ
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify Main method and entry point', () => {
      const lines = [
        'using System;',
        '',
        'public class Program {',
        '    public static void Main(string[] args) {',
        '        Console.WriteLine("Starting application...");',
        '        if (args.Length > 0) {',
        '            Console.WriteLine($"Arguments: {args.Length}");',
        '            for (int i = 0; i < args.Length; i++) {',
        '                Console.WriteLine($"Arg {i}: {args[i]}");',
        '            }',
        '        }',
        '        RunApplication();',
        '    }',
        '',
        '    private static void RunApplication() {',
        '        Console.WriteLine("Application running...");',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // public static void Main
      expect(footerLines).toContain(5); // Console.WriteLine
      expect(footerLines).toContain(6); // if (args.Length > 0)
      expect(footerLines).toContain(7); // Console.WriteLine
      expect(footerLines).toContain(8); // for loop
      expect(footerLines).toContain(9); // Console.WriteLine
      expect(footerLines).toContain(11); // RunApplication()
      expect(footerLines).toContain(13); // private static void RunApplication
      expect(footerLines).toContain(14); // Console.WriteLine
    });

    test('should identify static constructor and initialization', () => {
      const lines = [
        'using System;',
        'using Microsoft.Extensions.Configuration;',
        '',
        'public class Startup {',
        '    public static IConfiguration Configuration { get; private set; }',
        '',
        '    static Startup() {',
        '        Configuration = new ConfigurationBuilder()',
        '            .AddJsonFile("appsettings.json")',
        '            .Build();',
        '        Console.WriteLine("Configuration loaded");',
        '    }',
        '',
        '    public void ConfigureServices(IServiceCollection services) {',
        '        services.AddSingleton<IUserService, UserService>();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(7); // static Startup()
      expect(footerLines).toContain(8); // Configuration = new ConfigurationBuilder
      expect(footerLines).toContain(9); // .AddJsonFile
      expect(footerLines).toContain(10); // .Build()
      expect(footerLines).toContain(11); // Console.WriteLine
      expect(footerLines).toContain(13); // public void ConfigureServices
      expect(footerLines).toContain(14); // services.AddSingleton
    });

    test('should identify event handlers and async main', () => {
      const lines = [
        'using System;',
        'using System.Threading.Tasks;',
        '',
        'public class Program {',
        '    public static async Task Main(string[] args) {',
        '        Console.WriteLine("Starting async application...");',
        '        try {',
        '            await RunAsync(args);',
        '            Console.WriteLine("Application completed successfully");',
        '        } catch (Exception ex) {',
        '            Console.WriteLine($"Error: {ex.Message}");',
        '            Environment.Exit(1);',
        '        }',
        '    }',
        '',
        '    private static async Task RunAsync(string[] args) {',
        '        await Task.Delay(1000);',
        '        Console.WriteLine("Async operation completed");',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(6); // public static async Task Main
      expect(footerLines).toContain(7); // Console.WriteLine
      expect(footerLines).toContain(8); // try
      expect(footerLines).toContain(9); // await RunAsync
      expect(footerLines).toContain(10); // Console.WriteLine
      expect(footerLines).toContain(11); // catch
      expect(footerLines).toContain(12); // Console.WriteLine
      expect(footerLines).toContain(13); // Environment.Exit
      expect(footerLines).toContain(16); // private static async Task RunAsync
      expect(footerLines).toContain(17); // await Task.Delay
      expect(footerLines).toContain(18); // Console.WriteLine
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = [
        'public class SimpleClass {',
        '    public string GetMessage() {',
        '        return "Hello, World!";',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        'public class ComplexClass {',
        '    public int ProcessData(List<int> data) {',
        '        if (data != null && data.Count > 0) {',
        '            for (int i = 0; i < data.Count; i++) {',
        '                if (data[i] % 2 == 0) {',
        '                    try {',
        '                        return ProcessEven(data[i]);',
        '                    } catch (Exception e) {',
        '                        return -1;',
        '                    }',
        '                } else if (data[i] < 0) {',
        '                    while (Math.Abs(data[i]) > 0) {',
        '                        data[i] += 1;',
        '                    }',
        '                }',
        '            }',
        '        }',
        '        return 0;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for async/await and LINQ', () => {
      const lines = [
        'public class AsyncService {',
        '    public async Task<List<User>> GetUsersAsync() {',
        '        var users = await _repository.GetAllAsync();',
        '        var result = users',
        '            .Where(u => u.IsActive)',
        '            .OrderBy(u => u.Name)',
        '            .Select(u => new { u.Id, u.Name })',
        '            .ToList();',
        '        return result;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to async/await and LINQ
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for generics and attributes', () => {
      const lines = [
        'public class GenericService<T, K> where T : class, K : struct {',
        '    [HttpGet("{id}")]',
        '    public async Task<ActionResult<T>> Get([FromRoute] K id) {',
        '        var entity = await _repository.FindAsync(id);',
        '        if (entity == null) {',
        '            return NotFound();',
        '        }',
        '        return Ok(entity);',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to generics, attributes, and async
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        'using System;',
        'using System.Collections.Generic;',
        'namespace MyApp {',
        '    public class UserService {',
        '        private readonly List<User> users;',
        '    }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // using System
      expect(headerLines).toContain(1); // using System.Collections.Generic
      expect(headerLines).toContain(2); // namespace MyApp
      expect(headerLines).toContain(3); // public class UserService
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'public class TestClass {',
        '    public void SimpleMethod() {',
        '        Console.WriteLine("simple");',
        '    }',
        '',
        '    public static int Add(int a, int b) {',
        '        return a + b;',
        '    }',
        '',
        '    private bool CheckCondition(int value) {',
        '        return value > 0;',
        '    }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleMethod = functions.find((f) => f.name === 'SimpleMethod');
      expect(simpleMethod).toBeDefined();

      const add = functions.find((f) => f.name === 'Add');
      expect(add).toBeDefined();

      const checkCondition = functions.find((f) => f.name === 'CheckCondition');
      expect(checkCondition).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'using System;',
        '',
        'public class Program {',
        '    public static void Main(string[] args) {',
        '        Console.WriteLine("Starting...");',
        '    }',
        '',
        '    static Program() {',
        '        Console.WriteLine("Static constructor");',
        '    }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // public static void Main
      expect(footerLines).toContain(5); // Console.WriteLine
      expect(footerLines).toContain(8); // static Program()
      expect(footerLines).toContain(9); // Console.WriteLine
    });
  });
});