import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { JavaLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/JavaLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('JavaLineLimitStrategy', () => {
  let strategy: JavaLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new JavaLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('java');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify package and import statements', () => {
      const lines = [
        'package com.example.app;',
        '',
        'import java.util.List;',
        'import java.util.ArrayList;',
        'import java.util.Map;',
        'import static java.util.Collections.emptyList;',
        '',
        'public class UserService {',
        '    private List<User> users;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package statement
      expect(headerLines).toContain(2); // import java.util.List
      expect(headerLines).toContain(3); // import java.util.ArrayList
      expect(headerLines).toContain(4); // import java.util.Map
      expect(headerLines).toContain(5); // import static
    });

    test('should identify class and interface declarations', () => {
      const lines = [
        'package com.example.models;',
        '',
        'public interface User {',
        '    String getName();',
        '    void setName(String name);',
        '}',
        '',
        'public abstract class AbstractService {',
        '    protected abstract void initialize();',
        '}',
        '',
        '@Entity',
        '@Table(name = "users")',
        'public class UserEntity extends AbstractService implements User {',
        '    @Id',
        '    private Long id;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(2); // public interface User
      expect(headerLines).toContain(7); // public abstract class AbstractService
      expect(headerLines).toContain(11); // @Entity
      expect(headerLines).toContain(12); // @Table
      expect(headerLines).toContain(13); // public class UserEntity
    });

    test('should identify annotations', () => {
      const lines = [
        'package com.example.service;',
        '',
        '@Component',
        '@Service("userService")',
        '@Transactional',
        'public class UserService {',
        '    @Autowired',
        '    private UserRepository userRepository;',
        '',
        '    @GetMapping("/users")',
        '    public List<User> getUsers() {',
        '        return userRepository.findAll();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(2); // @Component
      expect(headerLines).toContain(3); // @Service
      expect(headerLines).toContain(4); // @Transactional
      expect(headerLines).toContain(5); // public class UserService
      expect(headerLines).toContain(6); // @Autowired
      expect(headerLines).toContain(8); // @GetMapping
    });

    test('should identify enum and record declarations', () => {
      const lines = [
        'package com.example.enums;',
        '',
        'public enum Status {',
        '    ACTIVE("active"),',
        '    INACTIVE("inactive"),',
        '    PENDING("pending");',
        '',
        '    private final String value;',
        '}',
        '',
        'public record UserRecord(',
        '    Long id,',
        '    String name,',
        '    String email',
        ') {',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(2); // public enum Status
      expect(headerLines).toContain(9); // public record UserRecord
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze method declarations', () => {
      const lines = [
        'public class UserService {',
        '    public User getUser(Long id) {',
        '        return userRepository.findById(id);',
        '    }',
        '',
        '    public List<User> getAllUsers() {',
        '        if (userRepository.count() > 100) {',
        '            for (int i = 0; i < 10; i++) {',
        '                if (i % 2 == 0) {',
        '                    try {',
        '                        return userRepository.findTop10();',
        '                    } catch (Exception e) {',
        '                        return new ArrayList<>();',
        '                    }',
        '                }',
        '            }',
        '        }',
        '        return userRepository.findAll();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();
      expect(getUser!.complexity).toBeLessThan(0.5);

      const getAllUsers = functions.find((f) => f.name === 'getAllUsers');
      expect(getAllUsers).toBeDefined();
      expect(getAllUsers!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze constructors', () => {
      const lines = [
        'public class User {',
        '    private Long id;',
        '    private String name;',
        '',
        '    public User() {',
        '        this.id = null;',
        '        this.name = "Anonymous";',
        '    }',
        '',
        '    public User(Long id, String name) {',
        '        this.id = id;',
        '        this.name = name != null ? name : "Unknown";',
        '    }',
        '',
        '    @Autowired',
        '    public User(UserRepository repo) {',
        '        this.repository = repo;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      // Since FunctionAnalysis doesn't have parameters property, we'll test by line count
      const constructors = functions.filter((f) => f.name === 'User');
      expect(constructors).toHaveLength(3);

      const defaultConstructor = constructors.find((f) => f.lineCount <= 4);
      expect(defaultConstructor).toBeDefined();

      const parameterizedConstructor = constructors.find((f) => f.lineCount > 4 && f.lineCount <= 6);
      expect(parameterizedConstructor).toBeDefined();

      const autowiredConstructor = constructors.find((f) => f.lineCount > 6);
      expect(autowiredConstructor).toBeDefined();
    });

    test('should analyze interface methods', () => {
      const lines = [
        'public interface UserService {',
        '    User getUser(Long id);',
        '',
        '    List<User> getAllUsers();',
        '',
        '    default User getDefaultUser() {',
        '        return new User(0L, "Default");',
        '    }',
        '',
        '    static User createAnonymous() {',
        '        return new User(null, "Anonymous");',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();

      const getAllUsers = functions.find((f) => f.name === 'getAllUsers');
      expect(getAllUsers).toBeDefined();

      const getDefaultUser = functions.find((f) => f.name === 'getDefaultUser');
      expect(getDefaultUser).toBeDefined();

      const createAnonymous = functions.find((f) => f.name === 'createAnonymous');
      expect(createAnonymous).toBeDefined();
    });

    test('should analyze static and instance methods', () => {
      const lines = [
        'public class MathUtils {',
        '    public static int add(int a, int b) {',
        '        return a + b;',
        '    }',
        '',
        '    public static double multiply(double a, double b) {',
        '        return a * b;',
        '    }',
        '',
        '    public boolean isPositive(int number) {',
        '        return number > 0;',
        '    }',
        '',
        '    private synchronized void updateCache(Map<String, Object> cache) {',
        '        cache.put("timestamp", System.currentTimeMillis());',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const add = functions.find((f) => f.name === 'add');
      expect(add).toBeDefined();

      const multiply = functions.find((f) => f.name === 'multiply');
      expect(multiply).toBeDefined();

      const isPositive = functions.find((f) => f.name === 'isPositive');
      expect(isPositive).toBeDefined();

      const updateCache = functions.find((f) => f.name === 'updateCache');
      expect(updateCache).toBeDefined();
      expect(updateCache!.complexity).toBeGreaterThan(0.5); // Should account for synchronized
    });

    test('should analyze generic methods', () => {
      const lines = [
        'public class Repository<T, ID> {',
        '    public T findById(ID id) {',
        '        return entityManager.find(T.class, id);',
        '    }',
        '',
        '    public <R> List<R> findAll(Class<R> entityClass) {',
        '        return entityManager.createQuery("SELECT e FROM " + entityClass.getSimpleName(), entityClass).getResultList();',
        '    }',
        '',
        '    public <T extends Comparable<T>> T max(List<T> list) {',
        '        if (list == null || list.isEmpty()) {',
        '            return null;',
        '        }',
        '        T max = list.get(0);',
        '        for (T item : list) {',
        '            if (item.compareTo(max) > 0) {',
        '                max = item;',
        '            }',
        '        }',
        '        return max;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const findById = functions.find((f) => f.name === 'findById');
      expect(findById).toBeDefined();

      const findAll = functions.find((f) => f.name === 'findAll');
      expect(findAll).toBeDefined();

      const max = functions.find((f) => f.name === 'max');
      expect(max).toBeDefined();
      expect(max!.complexity).toBeGreaterThan(0.5); // Should account for loop and conditional
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main method', () => {
      const lines = [
        'import java.util.List;',
        'import java.util.ArrayList;',
        '',
        'public class Application {',
        '    private static List<String> data = new ArrayList<>();',
        '',
        '    public static void main(String[] args) {',
        '        System.out.println("Starting application...");',
        '        if (args.length > 0) {',
        '            processArgs(args);',
        '        }',
        '        runApplication();',
        '    }',
        '',
        '    private static void processArgs(String[] args) {',
        '        for (String arg : args) {',
        '            data.add(arg);',
        '        }',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(6); // public static void main
      expect(footerLines).toContain(7); // System.out.println
      expect(footerLines).toContain(8); // if (args.length > 0)
      expect(footerLines).toContain(9); // processArgs(args)
      expect(footerLines).toContain(10); // runApplication()
    });

    test('should identify static initialization blocks', () => {
      const lines = [
        'public class DatabaseConfig {',
        '    private static final String URL;',
        '    private static final String USERNAME;',
        '    private static final String PASSWORD;',
        '',
        '    static {',
        '        URL = System.getProperty("db.url", "localhost");',
        '        USERNAME = System.getProperty("db.user", "admin");',
        '        PASSWORD = System.getProperty("db.password", "secret");',
        '        System.out.println("Database configuration loaded");',
        '    }',
        '',
        '    public static String getUrl() {',
        '        return URL;',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(5); // static {
      expect(footerLines).toContain(6); // URL = System.getProperty
      expect(footerLines).toContain(7); // USERNAME = System.getProperty
      expect(footerLines).toContain(8); // PASSWORD = System.getProperty
      expect(footerLines).toContain(9); // System.out.println
      expect(footerLines).toContain(10); // }
    });

    test('should identify module-level code at the end', () => {
      const lines = [
        'import java.util.concurrent.ExecutorService;',
        'import java.util.concurrent.Executors;',
        '',
        'public class ThreadPoolManager {',
        '    private static final ExecutorService executor = Executors.newFixedThreadPool(10);',
        '',
        '    public static void shutdown() {',
        '        executor.shutdown();',
        '    }',
        '}',
        '',
        '// Runtime shutdown hook',
        'Runtime.getRuntime().addShutdownHook(new Thread(() -> {',
        '    System.out.println("Shutting down thread pool...");',
        '    ThreadPoolManager.shutdown();',
        '}));',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(10); // Runtime shutdown hook comment
      expect(footerLines).toContain(11); // Runtime.getRuntime().addShutdownHook
      expect(footerLines).toContain(12); // System.out.println
      expect(footerLines).toContain(13); // ThreadPoolManager.shutdown()
      expect(footerLines).toContain(14); // }));
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = [
        'public class SimpleClass {',
        '    public String getMessage() {',
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
        '    public int processData(List<Integer> data) {',
        '        if (data != null && !data.isEmpty()) {',
        '            for (Integer item : data) {',
        '                if (item % 2 == 0) {',
        '                    try {',
        '                        return processEven(item);',
        '                    } catch (Exception e) {',
        '                        return -1;',
        '                    }',
        '                } else if (item < 0) {',
        '                    while (Math.abs(item) > 0) {',
        '                        item += 1;',
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

    test('should account for annotations', () => {
      const lines = [
        'public class ServiceClass {',
        '    @Override',
        '    @Deprecated',
        '    @SuppressWarnings("unchecked")',
        '    public List<String> getData() {',
        '        return new ArrayList<>();',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to multiple annotations
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for generics and type complexity', () => {
      const lines = [
        'public class GenericService<T extends Comparable<T>, K extends Serializable> {',
        '    public <R extends Collection<T>> R processCollection(',
        '            Class<R> resultType,',
        '            Map<K, T> inputMap) {',
        '        return resultType.cast(inputMap.values());',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const methodNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!methodNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(methodNode);

      // Should have higher complexity due to complex generic constraints
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        'package com.example.service;',
        'import java.util.List;',
        'import java.util.Map;',
        'public class UserService {',
        '    private List<User> users;',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package
      expect(headerLines).toContain(1); // import
      expect(headerLines).toContain(2); // import
      expect(headerLines).toContain(3); // public class UserService
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'public class TestClass {',
        '    public void simpleMethod() {',
        '        System.out.println("simple");',
        '    }',
        '',
        '    public static int add(int a, int b) {',
        '        return a + b;',
        '    }',
        '',
        '    private boolean checkCondition(int value) {',
        '        return value > 0;',
        '    }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleMethod = functions.find((f) => f.name === 'simpleMethod');
      expect(simpleMethod).toBeDefined();

      const add = functions.find((f) => f.name === 'add');
      expect(add).toBeDefined();

      const checkCondition = functions.find((f) => f.name === 'checkCondition');
      expect(checkCondition).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'import java.util.List;',
        '',
        'public class Application {',
        '    public static void main(String[] args) {',
        '        System.out.println("Starting...");',
        '    }',
        '',
        'static {',
        '    System.out.println("Static init");',
        '}',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // public static void main
      expect(footerLines).toContain(5); // System.out.println
      expect(footerLines).toContain(7); // static {
      expect(footerLines).toContain(8); // System.out.println
    });
  });
});
