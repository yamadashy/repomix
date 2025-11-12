import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { PhpLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/PhpLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('PhpLineLimitStrategy', () => {
  let strategy: PhpLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new PhpLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('php');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify use statements and namespace declarations', () => {
      const lines = [
        '<?php',
        '',
        'use App\\Models\\User;',
        'use App\\Services\\UserService;',
        'use Illuminate\\Http\\Request;',
        'use function App\\Helpers\\format_date;',
        '',
        'namespace App\\Http\\Controllers;',
        '',
        'class UserController {',
        '    private $userService;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // <?php
      expect(headerLines).toContain(2); // use App\Models\User
      expect(headerLines).toContain(3); // use App\Services\UserService
      expect(headerLines).toContain(4); // use Illuminate\Http\Request
      expect(headerLines).toContain(5); // use function
      expect(headerLines).toContain(7); // namespace App\Http\Controllers
      expect(headerLines).toContain(9); // class UserController
    });

    test('should identify class and interface declarations', () => {
      const lines = [
        '<?php',
        '',
        'interface UserRepositoryInterface {',
        '    public function findById(int $id): ?User;',
        '    public function save(User $user): bool;',
        '    public function delete(int $id): bool;',
        '}',
        '',
        'abstract class AbstractService {',
        '    protected $logger;',
        '    abstract protected function initialize(): void;',
        '}',
        '',
        'trait Timestampable {',
        '    public function getCreatedAt(): DateTime;',
        '    public function setUpdatedAt(DateTime $date): void;',
        '}',
        '',
        'final class UserService extends AbstractService implements UserRepositoryInterface {',
        '    use Timestampable;',
        '    private $repository;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // <?php
      expect(headerLines).toContain(2); // interface UserRepositoryInterface
      expect(headerLines).toContain(7); // abstract class AbstractService
      expect(headerLines).toContain(11); // trait Timestampable
      expect(headerLines).toContain(16); // final class UserService
    });

    test('should identify constants and global variables', () => {
      const lines = [
        '<?php',
        '',
        'define("APP_VERSION", "1.0.0");',
        'define("DEBUG_MODE", true);',
        'define("MAX_RETRIES", 3);',
        '',
        'const API_URL = "https://api.example.com";',
        'const DEFAULT_TIMEOUT = 30;',
        '',
        'global $app_config;',
        'global $database_connection;',
        '',
        '$app_config = [',
        '    "debug" => DEBUG_MODE,',
        '    "version" => APP_VERSION,',
        '];',
        '',
        'class Config {',
        '    private static $instance = null;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // <?php
      expect(headerLines).toContain(2); // define
      expect(headerLines).toContain(3); // define
      expect(headerLines).toContain(4); // define
      expect(headerLines).toContain(6); // const API_URL
      expect(headerLines).toContain(7); // const DEFAULT_TIMEOUT
      expect(headerLines).toContain(9); // global $app_config
      expect(headerLines).toContain(10); // global $database_connection
      expect(headerLines).toContain(11); // $app_config = [
      expect(headerLines).toContain(16); // class Config
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function declarations', () => {
      const lines = [
        '<?php',
        '',
        'function simple_function() {',
        '    return "simple";',
        '}',
        '',
        'function complex_function($param) {',
        '    if ($param > 0) {',
        '        for ($i = 0; $i < $param; $i++) {',
        '            if ($i % 2 == 0) {',
        '                try {',
        '                    return process_even($i);',
        '                } catch (Exception $e) {',
        '                    return -1;',
        '                }',
        '            }',
        '        }',
        '    }',
        '    return $param;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const simpleFunc = functions.find((f) => f.name === 'simple_function');
      expect(simpleFunc).toBeDefined();
      expect(simpleFunc!.complexity).toBeLessThan(0.5);

      const complexFunc = functions.find((f) => f.name === 'complex_function');
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze method declarations', () => {
      const lines = [
        '<?php',
        '',
        'class UserService {',
        '    private $users = [];',
        '',
        '    public function getUser($id) {',
        '        return $this->users[$id] ?? null;',
        '    }',
        '',
        '    public function addUser($user) {',
        '        if (isset($this->users[$user["id"]])) {',
        '            throw new Exception("User already exists");',
        '        }',
        '        $this->users[$user["id"]] = $user;',
        '        return true;',
        '    }',
        '',
        '    public static function createInstance() {',
        '        return new self();',
        '    }',
        '',
        '    private function validateUser($user) {',
        '        return !empty($user["id"]) && !empty($user["name"]);',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();

      const addUser = functions.find((f) => f.name === 'addUser');
      expect(addUser).toBeDefined();
      expect(addUser!.complexity).toBeGreaterThan(0.5); // Should account for conditional and exception

      const createInstance = functions.find((f) => f.name === 'createInstance');
      expect(createInstance).toBeDefined();

      const validateUser = functions.find((f) => f.name === 'validateUser');
      expect(validateUser).toBeDefined();
    });

    test('should analyze arrow functions and closures', () => {
      const lines = [
        '<?php',
        '',
        '$simpleArrow = fn() => "simple";',
        '',
        '$complexArrow = fn($param) => {',
        '    if ($param > 0) {',
        '        return array_map(fn($x) => $x * 2, range(1, $param + 1));',
        '    }',
        '    return $param;',
        '};',
        '',
        '$closure = function($multiplier) {',
        '    return function($value) use ($multiplier) {',
        '        return $value * $multiplier;',
        '    };',
        '};',
        '',
        'function processWithCallback($data, $callback) {',
        '    $result = array_map($callback, $data);',
        '    return $result;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const simpleArrow = functions.find((f) => f.name === 'simpleArrow');
      expect(simpleArrow).toBeDefined();

      const complexArrow = functions.find((f) => f.name === 'complexArrow');
      expect(complexArrow).toBeDefined();
      expect(complexArrow!.complexity).toBeGreaterThan(0.5); // Should account for closure and array_map

      const closure = functions.find((f) => f.name === 'closure');
      expect(closure).toBeDefined();
      expect(closure!.complexity).toBeGreaterThan(0.5); // Should account for use statement

      const processWithCallback = functions.find((f) => f.name === 'processWithCallback');
      expect(processWithCallback).toBeDefined();
      expect(processWithCallback!.complexity).toBeGreaterThan(0.5); // Should account for array_map
    });

    test('should analyze magic methods and interfaces', () => {
      const lines = [
        '<?php',
        '',
        'interface LoggableInterface {',
        '    public function log(string $message): void;',
        '    public function error(string $error): void;',
        '}',
        '',
        'abstract class AbstractLogger implements LoggableInterface {',
        '    abstract protected function writeLog(string $level, string $message): void;',
        '    ',
        '    public function __construct($config) {',
        '        $this->config = $config;',
        '    }',
        '    ',
        '    public function __destruct() {',
        '        $this->cleanup();',
        '    }',
        '    ',
        '    public function __toString(): string {',
        '        return get_class($this);',
        '    }',
        '}',
        '',
        'class FileLogger extends AbstractLogger {',
        '    private $handle;',
        '    ',
        '    public function __construct($filename) {',
        '        parent::__construct(["file" => $filename]);',
        '        $this->handle = fopen($filename, "a");',
        '    }',
        '    ',
        '    protected function writeLog(string $level, string $message): void {',
        '        fwrite($this->handle, "[$level] $message\\n");',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(7);

      const log = functions.find((f) => f.name === 'log');
      expect(log).toBeDefined();

      const error = functions.find((f) => f.name === 'error');
      expect(error).toBeDefined();

      const abstractConstruct = functions.find((f) => f.name === '__construct' && f.lineCount <= 4);
      expect(abstractConstruct).toBeDefined();

      const abstractDestruct = functions.find((f) => f.name === '__destruct');
      expect(abstractDestruct).toBeDefined();

      const abstractToString = functions.find((f) => f.name === '__toString');
      expect(abstractToString).toBeDefined();

      const fileConstruct = functions.find((f) => f.name === '__construct' && f.lineCount > 4);
      expect(fileConstruct).toBeDefined();
      expect(fileConstruct!.complexity).toBeGreaterThan(0.5); // Should account for parent call and file operations

      const writeLog = functions.find((f) => f.name === 'writeLog');
      expect(writeLog).toBeDefined();
      expect(writeLog!.complexity).toBeGreaterThan(0.5); // Should account for file operations
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main execution block', () => {
      const lines = [
        '<?php',
        '',
        'require_once "config.php";',
        'require_once "database.php";',
        '',
        'function helper_function() {',
        '    return "helper";',
        '}',
        '',
        '// Main execution',
        'if ($_SERVER["REQUEST_METHOD"] === "POST") {',
        '    $data = json_decode(file_get_contents("php://input"), true);',
        '    process_post_data($data);',
        '} else {',
        '    display_form();',
        '}',
        '',
        'echo "Script completed";',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(8); // // Main execution
      expect(footerLines).toContain(9); // if ($_SERVER["REQUEST_METHOD"])
      expect(footerLines).toContain(10); // $data = json_decode
      expect(footerLines).toContain(11); // process_post_data
      expect(footerLines).toContain(12); // } else {
      expect(footerLines).toContain(13); // display_form()
      expect(footerLines).toContain(15); // echo "Script completed"
    });

    test('should identify module-level code at the end', () => {
      const lines = [
        '<?php',
        '',
        'class Application {',
        '    private static $instance = null;',
        '    ',
        '    public static function getInstance() {',
        '        if (self::$instance === null) {',
        '            self::$instance = new self();',
        '        }',
        '        return self::$instance;',
        '    }',
        '}',
        '',
        '// Application bootstrap',
        'Application::getInstance()->run();',
        'register_shutdown_function(function() {',
        '    Application::getInstance()->cleanup();',
        '});',
        '',
        'echo "Application started";',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(14); // // Application bootstrap
      expect(footerLines).toContain(15); // Application::getInstance()->run()
      expect(footerLines).toContain(16); // register_shutdown_function
      expect(footerLines).toContain(17); // Application::getInstance()->cleanup()
      expect(footerLines).toContain(19); // echo "Application started"
    });

    test('should identify CLI script entry point', () => {
      const lines = [
        '<?php',
        '',
        'class CliApp {',
        '    public function run(array $argv) {',
        '        $options = $this->parseArguments($argv);',
        '        $this->executeCommand($options);',
        '    }',
        '}',
        '',
        '// CLI entry point',
        '$app = new CliApp();',
        'if (php_sapi_name() === "cli") {',
        '    $app->run($argv);',
        '} else {',
        '    echo "This script must be run from CLI\\n";',
        '    exit(1);',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(9); // // CLI entry point
      expect(footerLines).toContain(10); // $app = new CliApp()
      expect(footerLines).toContain(11); // if (php_sapi_name() === "cli")
      expect(footerLines).toContain(12); // $app->run($argv)
      expect(footerLines).toContain(13); // } else {
      expect(footerLines).toContain(14); // echo
      expect(footerLines).toContain(15); // exit(1)
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['<?php', '', 'function simple_function() {', '    return "simple";', '}'];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        '<?php',
        '',
        'function complex_function($param) {',
        '    if ($param > 0) {',
        '        for ($i = 0; $i < $param; $i++) {',
        '            if ($i % 2 == 0) {',
        '                try {',
        '                    return process_even($i);',
        '                } catch (Exception $e) {',
        '                    return -1;',
        '                }',
        '            } elseif ($param < 0) {',
        '                while (abs($param) > 0) {',
        '                    $param += 1;',
        '                }',
        '            }',
        '        }',
        '    }',
        '    return $param;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for array operations and built-in functions', () => {
      const lines = [
        '<?php',
        '',
        'function array_processor($data) {',
        '    $filtered = array_filter($data, function($item) {',
        '        return $item["active"] === true;',
        '    });',
        '    ',
        '    $mapped = array_map(function($item) {',
        '        return [',
        '            "id" => $item["id"],',
        '            "name" => strtoupper($item["name"]),',
        '            "score" => $item["score"] * 2,',
        '        ];',
        '    }, $filtered);',
        '    ',
        '    $reduced = array_reduce($mapped, function($carry, $item) {',
        '        return $carry + $item["score"];',
        '    }, 0);',
        '    ',
        '    return array_slice($reduced, 0, 10);',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to array operations and closures
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for class methods and inheritance', () => {
      const lines = [
        '<?php',
        '',
        'class BaseService {',
        '    protected function validate($data) {',
        '        return !empty($data) && is_array($data);',
        '    }',
        '}',
        '',
        'class UserService extends BaseService {',
        '    private $repository;',
        '    ',
        '    public function __construct($repository) {',
        '        parent::__construct();',
        '        $this->repository = $repository;',
        '    }',
        '    ',
        '    public function save($data) {',
        '        if (!parent::validate($data)) {',
        '            throw new InvalidArgumentException("Invalid data");',
        '        }',
        '        return $this->repository->save($data);',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('method_declaration')[0];
      if (!functionNode) throw new Error('Method node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to parent:: call and exception handling
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        '<?php',
        'use App\\Models\\User;',
        'use App\\Services\\UserService;',
        'class UserController {',
        '    private $userService;',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // <?php
      expect(headerLines).toContain(1); // use
      expect(headerLines).toContain(2); // use
      expect(headerLines).toContain(3); // class UserController
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        '<?php',
        'function simple_function() {',
        '    return "simple";',
        '}',
        '',
        'function complex_function($param) {',
        '    if ($param > 0) {',
        '        for ($i = 0; $i < $param; $i++) {',
        '            echo $i;',
        '        }',
        '    }',
        '    return $param;',
        '}',
        '',
        'class TestClass {',
        '    public function method() {',
        '        return "method";',
        '    }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleFunc = functions.find((f) => f.name === 'simple_function');
      expect(simpleFunc).toBeDefined();

      const complexFunc = functions.find((f) => f.name === 'complex_function');
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.complexity).toBeGreaterThan(0.5);

      const method = functions.find((f) => f.name === 'method');
      expect(method).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        '<?php',
        'function helper() {',
        '    return "helper";',
        '}',
        'function main() {',
        '    echo "Starting...";',
        '    helper();',
        '    echo "Done";',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(5); // function main
      expect(footerLines).toContain(6); // echo "Starting..."
      expect(footerLines).toContain(7); // helper()
      expect(footerLines).toContain(8); // echo "Done"
    });
  });
});
