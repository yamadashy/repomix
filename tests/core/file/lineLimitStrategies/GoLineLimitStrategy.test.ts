import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { GoLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/GoLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('GoLineLimitStrategy', () => {
  let strategy: GoLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new GoLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('go');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify package and import statements', () => {
      const lines = [
        'package main',
        '',
        'import (',
        '	"fmt"',
        '	"net/http"',
        '	"os"',
        '	"strings"',
        ')',
        '',
        'import (',
        '	"github.com/gin-gonic/gin"',
        '	"gorm.io/gorm"',
        ')',
        '',
        'func main() {',
        '	fmt.Println("Hello, World!")',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package main
      expect(headerLines).toContain(2); // import (
      expect(headerLines).toContain(3); // "fmt"
      expect(headerLines).toContain(4); // "net/http"
      expect(headerLines).toContain(5); // "os"
      expect(headerLines).toContain(6); // "strings"
      expect(headerLines).toContain(7); // )
      expect(headerLines).toContain(9); // import (
      expect(headerLines).toContain(10); // "github.com/gin-gonic/gin"
      expect(headerLines).toContain(11); // "gorm.io/gorm"
      expect(headerLines).toContain(12); // )
    });

    test('should identify type definitions and interfaces', () => {
      const lines = [
        'package models',
        '',
        'type User struct {',
        '	ID       uint   `gorm:"primaryKey"`',
        '	Name     string `gorm:"not null"`',
        '	Email    string `gorm:"uniqueIndex"`',
        '	CreatedAt time.Time',
        '	UpdatedAt time.Time',
        '}',
        '',
        'type Status int',
        '',
        'const (',
        '	StatusActive Status = iota',
        '	StatusInactive',
        '	StatusPending',
        ')',
        '',
        'type UserRepository interface {',
        '	Create(user *User) error',
        '	GetByID(id uint) (*User, error)',
        '	Update(user *User) error',
        '	Delete(id uint) error',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package models
      expect(headerLines).toContain(2); // type User struct
      expect(headerLines).toContain(9); // type Status int
      expect(headerLines).toContain(11); // const (
      expect(headerLines).toContain(12); // StatusActive Status = iota
      expect(headerLines).toContain(15); // )
      expect(headerLines).toContain(17); // type UserRepository interface
    });

    test('should identify variable declarations and init functions', () => {
      const lines = [
        'package config',
        '',
        'var (',
        '	DatabaseURL string',
        '	ServerPort  int',
        '	DebugMode   bool',
        ')',
        '',
        'func init() {',
        '	DatabaseURL = os.Getenv("DATABASE_URL")',
        '	if DatabaseURL == "" {',
        '		DatabaseURL = "localhost:5432"',
        '	}',
        '	ServerPort = 8080',
        '	DebugMode = false',
        '}',
        '',
        'func GetConfig() Config {',
        '	return Config{',
        '		DatabaseURL: DatabaseURL,',
        '		ServerPort:  ServerPort,',
        '		DebugMode:   DebugMode,',
        '	}',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package config
      expect(headerLines).toContain(2); // var (
      expect(headerLines).toContain(3); // DatabaseURL string
      expect(headerLines).toContain(4); // ServerPort int
      expect(headerLines).toContain(5); // DebugMode bool
      expect(headerLines).toContain(6); // )
      expect(headerLines).toContain(8); // func init()
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function declarations', () => {
      const lines = [
        'package main',
        '',
        'func simpleFunction() string {',
        '	return "simple"',
        '}',
        '',
        'func complexFunction(param string) string {',
        '	if param != "" {',
        '		for i, char := range param {',
        "			if char == 'a' {",
        '				defer func() {',
        '					fmt.Println("deferred")',
        '				}()',
        '				return processA(char)',
        "			} else if char == 'b' {",
        '				go func() {',
        '					processB(char)',
        '				}()',
        '			}',
        '		}',
        '	}',
        '	return "not found"',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const simpleFunc = functions.find((f) => f.name === 'simpleFunction');
      expect(simpleFunc).toBeDefined();
      expect(simpleFunc!.complexity).toBeLessThan(0.5);

      const complexFunc = functions.find((f) => f.name === 'complexFunction');
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze method declarations', () => {
      const lines = [
        'package main',
        '',
        'type UserService struct {',
        '	users map[string]User',
        '	mutex sync.RWMutex',
        '}',
        '',
        'func (s *UserService) GetUser(id string) (User, bool) {',
        '	s.mutex.RLock()',
        '	defer s.mutex.RUnlock()',
        '	user, exists := s.users[id]',
        '	return user, exists',
        '}',
        '',
        'func (s *UserService) AddUser(user User) error {',
        '	s.mutex.Lock()',
        '	defer s.mutex.Unlock()',
        '	if _, exists := s.users[user.ID]; exists {',
        '		return fmt.Errorf("user already exists")',
        '	}',
        '	s.users[user.ID] = user',
        '	return nil',
        '}',
        '',
        'func (s *UserService) ListUsers() []User {',
        '	s.mutex.RLock()',
        '	defer s.mutex.RUnlock()',
        '	users := make([]User, 0, len(s.users))',
        '	for _, user := range s.users {',
        '		users = append(users, user)',
        '	}',
        '	return users',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const getUser = functions.find((f) => f.name === 'GetUser');
      expect(getUser).toBeDefined();

      const addUser = functions.find((f) => f.name === 'AddUser');
      expect(addUser).toBeDefined();
      expect(addUser!.complexity).toBeGreaterThan(0.5); // Should account for mutex and conditional

      const listUsers = functions.find((f) => f.name === 'ListUsers');
      expect(listUsers).toBeDefined();
      expect(listUsers!.complexity).toBeGreaterThan(0.5); // Should account for loop and mutex
    });

    test('should analyze interface methods', () => {
      const lines = [
        'package repository',
        '',
        'type UserRepository interface {',
        '	Create(ctx context.Context, user *User) error',
        '	GetByID(ctx context.Context, id string) (*User, error)',
        '	Update(ctx context.Context, user *User) error',
        '	Delete(ctx context.Context, id string) error',
        '	List(ctx context.Context, filter UserFilter) ([]User, error)',
        '	Count(ctx context.Context, filter UserFilter) (int64, error)',
        '}',
        '',
        'type CacheRepository interface {',
        '	Get(key string) (interface{}, bool)',
        '	Set(key string, value interface{}, ttl time.Duration) error',
        '	Delete(key string) error',
        '	Clear() error',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(10);

      const create = functions.find((f) => f.name === 'Create');
      expect(create).toBeDefined();

      const getByID = functions.find((f) => f.name === 'GetByID');
      expect(getByID).toBeDefined();

      const update = functions.find((f) => f.name === 'Update');
      expect(update).toBeDefined();

      const deleteFunc = functions.find((f) => f.name === 'Delete');
      expect(deleteFunc).toBeDefined();

      const list = functions.find((f) => f.name === 'List');
      expect(list).toBeDefined();

      const count = functions.find((f) => f.name === 'Count');
      expect(count).toBeDefined();

      const cacheGet = functions.find((f) => f.name === 'Get');
      expect(cacheGet).toBeDefined();

      const cacheSet = functions.find((f) => f.name === 'Set');
      expect(cacheSet).toBeDefined();

      const cacheDelete = functions.find((f) => f.name === 'Delete');
      expect(cacheDelete).toBeDefined();

      const cacheClear = functions.find((f) => f.name === 'Clear');
      expect(cacheClear).toBeDefined();
    });

    test('should analyze goroutines and channels', () => {
      const lines = [
        'package main',
        '',
        'func worker(id int, jobs <-chan Job, results chan<- Result) {',
        '	for j := range jobs {',
        '		fmt.Printf("Worker %d started job %d\n", id, j.ID)',
        '		result := Result{',
        '			JobID:  j.ID,',
        '			Worker: id,',
        '			Output: processJob(j),',
        '		}',
        '		select {',
        '		case results <- result:',
        '			fmt.Printf("Worker %d completed job %d\n", id, j.ID)',
        '		case <-time.After(time.Second * 5):',
        '			fmt.Printf("Worker %d timeout on job %d\n", id, j.ID)',
        '		}',
        '	}',
        '}',
        '',
        'func dispatcher(jobs []Job) []Result {',
        '	jobsChan := make(chan Job, len(jobs))',
        '	resultsChan := make(chan Result, len(jobs))',
        '',
        '	for i := 0; i < 3; i++ {',
        '		go worker(i, jobsChan, resultsChan)',
        '	}',
        '',
        '	for _, job := range jobs {',
        '		jobsChan <- job',
        '	}',
        '	close(jobsChan)',
        '',
        '	var results []Result',
        '	for i := 0; i < len(jobs); i++ {',
        '		results = append(results, <-resultsChan)',
        '	}',
        '',
        '	return results',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const worker = functions.find((f) => f.name === 'worker');
      expect(worker).toBeDefined();
      expect(worker!.complexity).toBeGreaterThan(0.5); // Should account for goroutine, channel, select

      const dispatcher = functions.find((f) => f.name === 'dispatcher');
      expect(dispatcher).toBeDefined();
      expect(dispatcher!.complexity).toBeGreaterThan(0.5); // Should account for goroutines and channels
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main function', () => {
      const lines = [
        'package main',
        '',
        'import "fmt"',
        '',
        'func greet(name string) {',
        '	fmt.Printf("Hello, %s!\n", name)',
        '}',
        '',
        'func main() {',
        '	fmt.Println("Starting application...")',
        '	if len(os.Args) > 1 {',
        '		greet(os.Args[1])',
        '	} else {',
        '		greet("World")',
        '	}',
        '	fmt.Println("Application finished")',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(7); // func main()
      expect(footerLines).toContain(8); // fmt.Println
      expect(footerLines).toContain(9); // if len(os.Args) > 1
      expect(footerLines).toContain(10); // greet(os.Args[1])
      expect(footerLines).toContain(11); // } else {
      expect(footerLines).toContain(12); // greet("World")
      expect(footerLines).toContain(13); // fmt.Println
    });

    test('should identify init function calls and setup code', () => {
      const lines = [
        'package main',
        '',
        'import (',
        '	"log"',
        '	"os"',
        '	"syscall"',
        ')',
        '',
        'func setupLogging() {',
        '	log.SetFlags(log.LstdFlags | log.Lshortfile)',
        '}',
        '',
        'func setupSignals() {',
        '	sigChan := make(chan os.Signal, 1)',
        '	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)',
        '	go func() {',
        '		<-sigChan',
        '		log.Println("Received signal, shutting down...")',
        '		os.Exit(0)',
        '	}()',
        '}',
        '',
        '// Application setup',
        'func init() {',
        '	setupLogging()',
        '	setupSignals()',
        '	log.Println("Application initialized")',
        '}',
        '',
        'func main() {',
        '	log.Println("Starting main...")',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(22); // // Application setup
      expect(footerLines).toContain(23); // func init()
      expect(footerLines).toContain(24); // setupLogging()
      expect(footerLines).toContain(25); // setupSignals()
      expect(footerLines).toContain(26); // log.Println
      expect(footerLines).toContain(28); // func main()
      expect(footerLines).toContain(29); // log.Println
    });

    test('should identify package-level variable initialization', () => {
      const lines = [
        'package config',
        '',
        'import (',
        '	"os"',
        '	"strconv"',
        ')',
        '',
        'var (',
        '	ServerPort int',
        '	DebugMode bool',
        ')',
        '',
        'func init() {',
        '	if port := os.Getenv("PORT"); port != "" {',
        '		if p, err := strconv.Atoi(port); err == nil {',
        '			ServerPort = p',
        '		}',
        '	}',
        '	if debug := os.Getenv("DEBUG"); debug != "" {',
        '		DebugMode = debug == "true"',
        '	}',
        '}',
        '',
        '// Default configuration values',
        'func SetDefaults() {',
        '	if ServerPort == 0 {',
        '		ServerPort = 8080',
        '	}',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(10); // func init()
      expect(footerLines).toContain(11); // if port := os.Getenv
      expect(footerLines).toContain(12); // if p, err := strconv.Atoi
      expect(footerLines).toContain(15); // if debug := os.Getenv
      expect(footerLines).toContain(16); // DebugMode = debug == "true"
      expect(footerLines).toContain(20); // // Default configuration values
      expect(footerLines).toContain(21); // func SetDefaults()
      expect(footerLines).toContain(22); // if ServerPort == 0
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['package main', '', 'func simpleFunction() string {', '	return "simple"', '}'];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        'package main',
        '',
        'func complexFunction(data []int) int {',
        '	if len(data) == 0 {',
        '		return 0',
        '	}',
        '	sum := 0',
        '	for i, v := range data {',
        '		if v%2 == 0 {',
        '			sum += v * 2',
        '		} else if v < 0 {',
        '			for j := 0; j < 5; j++ {',
        '				sum += v',
        '			}',
        '		} else {',
        '			switch v {',
        '			case 1:',
        '				sum += 10',
        '			case 3:',
        '				sum += 30',
        '			default:',
        '				sum += v',
        '			}',
        '		}',
        '	}',
        '	return sum',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for goroutines and channels', () => {
      const lines = [
        'package main',
        '',
        'func concurrentProcessor(data []int) []int {',
        '	ch := make(chan int, len(data))',
        '	for _, v := range data {',
        '		go func(val int) {',
        '			result := val * 2',
        '			ch <- result',
        '		}(v)',
        '	}',
        '	results := make([]int, 0, len(data))',
        '	for i := 0; i < len(data); i++ {',
        '		select {',
        '		case result := <-ch:',
        '			results = append(results, result)',
        '		case <-time.After(time.Second):',
        '			break',
        '		}',
        '	}',
        '	return results',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to goroutines, channels, and select
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for defer and panic/recover', () => {
      const lines = [
        'package main',
        '',
        'func safeOperation() (result string, err error) {',
        '	defer func() {',
        '		if r := recover(); r != nil {',
        '			fmt.Printf("Recovered from panic: %v\n", r)',
        '			err = fmt.Errorf("operation failed")',
        '		}',
        '	}()',
        '	',
        '	if someCondition {',
        '		panic("something went wrong")',
        '	}',
        '	',
        '	result = "operation completed"',
        '	return result, nil',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to defer, panic/recover
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        'package main',
        'import "fmt"',
        'import "os"',
        'type User struct {',
        '	Name string',
        '}',
        'func main() {',
        '	fmt.Println("Hello")',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // package
      expect(headerLines).toContain(1); // import
      expect(headerLines).toContain(2); // import
      expect(headerLines).toContain(3); // type User struct
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'package main',
        'func simpleFunction() {',
        '	fmt.Println("simple")',
        '}',
        '',
        'func (s *Service) method() {',
        '	fmt.Println("method")',
        '}',
        '',
        'func complexFunction(param string) {',
        '	if param != "" {',
        '		for i := 0; i < 10; i++ {',
        '			fmt.Println(i)',
        '		}',
        '	}',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleFunc = functions.find((f) => f.name === 'simpleFunction');
      expect(simpleFunc).toBeDefined();

      const method = functions.find((f) => f.name === 'method');
      expect(method).toBeDefined();

      const complexFunc = functions.find((f) => f.name === 'complexFunction');
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.complexity).toBeGreaterThan(0.5);
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'package main',
        'import "fmt"',
        'func helper() {',
        '	fmt.Println("helper")',
        '}',
        'func main() {',
        '	fmt.Println("Starting...")',
        '	helper()',
        '	fmt.Println("Done")',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(5); // func main()
      expect(footerLines).toContain(6); // fmt.Println
      expect(footerLines).toContain(7); // helper()
      expect(footerLines).toContain(8); // fmt.Println
    });
  });
});
