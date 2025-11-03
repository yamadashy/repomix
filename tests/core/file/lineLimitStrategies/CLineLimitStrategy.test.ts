import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { CLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/CLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('CLineLimitStrategy', () => {
  let strategy: CLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new CLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('c');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify include statements and preprocessor directives', () => {
      const lines = [
        '#include <stdio.h>',
        '#include <stdlib.h>',
        '#include <string.h>',
        '#include "myheader.h"',
        '',
        '#define MAX_SIZE 100',
        '#define PI 3.14159',
        '',
        '#ifdef DEBUG',
        '#define LOG(x) printf(x)',
        '#else',
        '#define LOG(x)',
        '#endif',
        '',
        'int main() {',
        '    return 0;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // #include <stdio.h>
      expect(headerLines).toContain(1); // #include <stdlib.h>
      expect(headerLines).toContain(2); // #include <string.h>
      expect(headerLines).toContain(3); // #include "myheader.h"
      expect(headerLines).toContain(5); // #define MAX_SIZE
      expect(headerLines).toContain(6); // #define PI
      expect(headerLines).toContain(8); // #ifdef DEBUG
      expect(headerLines).toContain(9); // #define LOG
      expect(headerLines).toContain(10); // #else
      expect(headerLines).toContain(11); // #define LOG
      expect(headerLines).toContain(12); // #endif
    });

    test('should identify function declarations and typedefs', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'typedef struct {',
        '    int id;',
        '    char name[50];',
        '    float score;',
        '} User;',
        '',
        'typedef enum {',
        '    ACTIVE,',
        '    INACTIVE,',
        '    PENDING',
        '} Status;',
        '',
        'int calculate_sum(int a, int b);',
        'void print_user(User* user);',
        'Status get_user_status(int user_id);',
        '',
        'int main() {',
        '    return 0;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // #include
      expect(headerLines).toContain(2); // typedef struct
      expect(headerLines).toContain(8); // typedef enum
      expect(headerLines).toContain(14); // int calculate_sum
      expect(headerLines).toContain(15); // void print_user
      expect(headerLines).toContain(16); // Status get_user_status
      expect(headerLines).toContain(18); // int main
    });

    test('should identify global variable declarations', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'int global_counter = 0;',
        'const char* VERSION = "1.0.0";',
        'static int instance_count = 0;',
        '',
        'struct Config {',
        '    int port;',
        '    char host[256];',
        '};',
        '',
        'extern struct Config app_config;',
        '',
        'int main() {',
        '    return 0;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // #include
      expect(headerLines).toContain(2); // int global_counter
      expect(headerLines).toContain(3); // const char* VERSION
      expect(headerLines).toContain(4); // static int instance_count
      expect(headerLines).toContain(6); // struct Config
      expect(headerLines).toContain(12); // extern struct Config
      expect(headerLines).toContain(14); // int main
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function definitions', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'int simple_function() {',
        '    return 42;',
        '}',
        '',
        'int complex_function(int param) {',
        '    if (param > 0) {',
        '        for (int i = 0; i < param; i++) {',
        '            if (i % 2 == 0) {',
        '                try {',
        '                    return process_even(i);',
        '                } catch (const char* error) {',
        '                    return -1;',
        '                }',
        '            }',
        '        }',
        '    }',
        '    return param;',
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

    test('should analyze function with pointers and arrays', () => {
      const lines = [
        '#include <stdio.h>',
        '#include <stdlib.h>',
        '',
        'void process_array(int* array, int size) {',
        '    for (int i = 0; i < size; i++) {',
        '        array[i] *= 2;',
        '    }',
        '}',
        '',
        'char* create_string(const char* input) {',
        '    if (!input) return NULL;',
        '    size_t len = strlen(input);',
        '    char* result = malloc(len + 1);',
        '    if (!result) return NULL;',
        '    strcpy(result, input);',
        '    return result;',
        '}',
        '',
        'int** create_matrix(int rows, int cols) {',
        '    int** matrix = malloc(rows * sizeof(int*));',
        '    for (int i = 0; i < rows; i++) {',
        '        matrix[i] = malloc(cols * sizeof(int));',
        '    }',
        '    return matrix;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const processArray = functions.find((f) => f.name === 'process_array');
      expect(processArray).toBeDefined();

      const createString = functions.find((f) => f.name === 'create_string');
      expect(createString).toBeDefined();
      expect(createString!.complexity).toBeGreaterThan(0.5); // Should account for pointers and malloc

      const createMatrix = functions.find((f) => f.name === 'create_matrix');
      expect(createMatrix).toBeDefined();
      expect(createMatrix!.complexity).toBeGreaterThan(0.5); // Should account for double pointers
    });

    test('should analyze recursive functions', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'int factorial(int n) {',
        '    if (n <= 1) {',
        '        return 1;',
        '    }',
        '    return n * factorial(n - 1);',
        '}',
        '',
        'int fibonacci(int n) {',
        '    if (n <= 1) {',
        '        return n;',
        '    }',
        '    return fibonacci(n - 1) + fibonacci(n - 2);',
        '}',
        '',
        'int gcd(int a, int b) {',
        '    if (b == 0) {',
        '        return a;',
        '    }',
        '    return gcd(b, a % b);',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const factorial = functions.find((f) => f.name === 'factorial');
      expect(factorial).toBeDefined();

      const fibonacci = functions.find((f) => f.name === 'fibonacci');
      expect(fibonacci).toBeDefined();
      expect(fibonacci!.complexity).toBeGreaterThan(0.5); // Should account for recursion

      const gcd = functions.find((f) => f.name === 'gcd');
      expect(gcd).toBeDefined();
      expect(gcd!.complexity).toBeGreaterThan(0.5); // Should account for recursion
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main function', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'void helper_function() {',
        '    printf("Helper function\\n");',
        '}',
        '',
        'int main(int argc, char* argv[]) {',
        '    printf("Starting program\\n");',
        '    if (argc > 1) {',
        '        printf("Arguments: %d\\n", argc);',
        '        for (int i = 0; i < argc; i++) {',
        '            printf("Arg %d: %s\\n", i, argv[i]);',
        '        }',
        '    }',
        '    helper_function();',
        '    return 0;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(6); // int main
      expect(footerLines).toContain(7); // printf
      expect(footerLines).toContain(8); // if (argc > 1)
      expect(footerLines).toContain(9); // printf
      expect(footerLines).toContain(10); // for loop
      expect(footerLines).toContain(11); // printf
      expect(footerLines).toContain(13); // helper_function()
      expect(footerLines).toContain(14); // return 0
    });

    test('should identify initialization code at end', () => {
      const lines = [
        '#include <stdio.h>',
        '',
        'void init_config() {',
        '    printf("Initializing config\\n");',
        '}',
        '',
        'void cleanup() {',
        '    printf("Cleaning up\\n");',
        '}',
        '',
        '// Program entry point',
        'int main() {',
        '    init_config();',
        '    printf("Program running\\n");',
        '    // Main program logic here',
        '    cleanup();',
        '    return 0;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(9); // // Program entry point
      expect(footerLines).toContain(10); // int main
      expect(footerLines).toContain(11); // init_config()
      expect(footerLines).toContain(12); // printf
      expect(footerLines).toContain(14); // cleanup()
      expect(footerLines).toContain(15); // return 0
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['int simple_function() {', '    return 42;', '}'];

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
        'int complex_function(int param) {',
        '    if (param > 0) {',
        '        for (int i = 0; i < param; i++) {',
        '            if (i % 2 == 0) {',
        '                switch (i) {',
        '                    case 0:',
        '                        return process_zero();',
        '                    case 1:',
        '                        return process_one();',
        '                    default:',
        '                        return process_default(i);',
        '                }',
        '            }',
        '        }',
        '    }',
        '    return param;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for pointer operations', () => {
      const lines = [
        'void pointer_function(int* ptr, int** double_ptr) {',
        '    if (!ptr || !double_ptr) {',
        '        return;',
        '    }',
        '    *ptr = 42;',
        '    *double_ptr = &ptr;',
        '    **double_ptr = 100;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to pointer operations
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        '#include <stdio.h>',
        '#include <stdlib.h>',
        'typedef struct {',
        '    int x;',
        '    int y;',
        '} Point;',
        'int main() {',
        '    return 0;',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // #include
      expect(headerLines).toContain(1); // #include
      expect(headerLines).toContain(2); // typedef struct
      expect(headerLines).toContain(5); // int main
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'int simple_function() {',
        '    return 42;',
        '}',
        '',
        'void complex_function(int param) {',
        '    if (param > 0) {',
        '        for (int i = 0; i < param; i++) {',
        '            printf("%d\\n", i);',
        '        }',
        '    }',
        '}',
        '',
        'char* string_function(const char* input) {',
        '    return strdup(input);',
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

      const stringFunc = functions.find((f) => f.name === 'string_function');
      expect(stringFunc).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        '#include <stdio.h>',
        'void helper() {',
        '    printf("helper\\n");',
        '}',
        'int main() {',
        '    printf("main\\n");',
        '    helper();',
        '    return 0;',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // int main
      expect(footerLines).toContain(5); // printf
      expect(footerLines).toContain(6); // helper()
      expect(footerLines).toContain(7); // return 0
    });
  });
});
