import { describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { PythonLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/PythonLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('PythonLineLimitStrategy', () => {
  let strategy: PythonLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new PythonLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('python');
    parser.setLanguage(lang);
  });

  describe('identifyHeaderLines', () => {
    test('should identify import statements', () => {
      const lines = [
        '#!/usr/bin/env python3',
        '',
        'import os',
        'import sys',
        'from typing import List, Dict',
        'from collections import defaultdict',
        '',
        'def main():',
        '    pass',
      ];

      const tree = parser.parse(lines.join('\n'));
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // shebang
      expect(headerLines).toContain(2); // import os
      expect(headerLines).toContain(3); // import sys
      expect(headerLines).toContain(4); // from typing
      expect(headerLines).toContain(5); // from collections
    });

    test('should identify class and function signatures', () => {
      const lines = [
        'class UserService:',
        '    def __init__(self):',
        '        pass',
        '',
        '    def get_user(self, user_id: int) -> Dict:',
        '        return {"id": user_id, "name": "John"}',
        '',
        '    def save_user(self, user: Dict) -> bool:',
        '        # Save logic',
        '        return True',
      ];

      const tree = parser.parse(lines.join('\n'));
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // class UserService:
    });

    test('should handle decorators', () => {
      const lines = [
        '@dataclass',
        'class User:',
        '    id: int',
        '    name: str',
        '',
        '@staticmethod',
        'def create_user(id: int, name: str) -> "User":',
        '    return User(id=id, name=name)',
      ];

      const tree = parser.parse(lines.join('\n'));
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // @dataclass
      expect(headerLines).toContain(1); // class User:
      expect(headerLines).toContain(4); // @staticmethod
      expect(headerLines).toContain(5); // def create_user
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function definitions', () => {
      const lines = [
        'def simple_function():',
        '    return "simple"',
        '',
        'def complex_function(param: str) -> str:',
        '    if param:',
        '        for i in range(len(param)):',
        '            if param[i] == "a":',
        '                try:',
        '                    return process_a(param[i])',
        '                except Exception:',
        '                    return "error"',
        '    return "not found"',
      ];

      const tree = parser.parse(lines.join('\n'));
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const simpleFunc = functions.find((f) => f.name === 'simple_function');
      expect(simpleFunc).toBeDefined();
      expect(simpleFunc!.complexity).toBeLessThan(0.5);

      const complexFunc = functions.find((f) => f.name === 'complex_function');
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.complexity).toBeGreaterThan(0.5);
    });

    test('should analyze method definitions', () => {
      const lines = [
        'class UserService:',
        '    def __init__(self):',
        '        self.users = {}',
        '',
        '    def get_user(self, user_id: int):',
        '        return self.users.get(user_id)',
        '',
        '    def save_user(self, user: Dict):',
        '        self.users[user["id"]] = user',
        '        return True',
      ];

      const tree = parser.parse(lines.join('\n'));
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const initMethod = functions.find((f) => f.name === '__init__');
      expect(initMethod).toBeDefined();

      const getMethod = functions.find((f) => f.name === 'get_user');
      expect(getMethod).toBeDefined();

      const saveMethod = functions.find((f) => f.name === 'save_user');
      expect(saveMethod).toBeDefined();
    });

    test('should handle async functions', () => {
      const lines = [
        'async def fetch_data(url: str) -> Dict:',
        '    async with aiohttp.ClientSession() as session:',
        '        async with session.get(url) as response:',
        '            return await response.json()',
      ];

      const tree = parser.parse(lines.join('\n'));
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(1);

      const asyncFunc = functions[0];
      expect(asyncFunc.name).toBe('fetch_data');
      expect(asyncFunc.complexity).toBeGreaterThan(0.5); // Should account for async/await
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main execution block', () => {
      const lines = [
        'import sys',
        '',
        'def helper_function():',
        '    return "helper"',
        '',
        'if __name__ == "__main__":',
        '    print("Hello, World!")',
        '    result = helper_function()',
        '    print(result)',
      ];

      const tree = parser.parse(lines.join('\n'));
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // if __name__ == "__main__":
      expect(footerLines).toContain(5); // print("Hello, World!")
      expect(footerLines).toContain(6); // result = helper_function()
      expect(footerLines).toContain(7); // print(result)
    });

    test('should identify module-level code in last section', () => {
      const lines = [
        'import os',
        'import sys',
        '',
        'def main():',
        '    pass',
        '',
        '# Module-level configuration',
        'CONFIG = {"debug": True}',
        'LOGGER = setup_logger()',
        '',
        'if __name__ == "__main__":',
        '    main()',
      ];

      const tree = parser.parse(lines.join('\n'));
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(7); // CONFIG = {"debug": True}
      expect(footerLines).toContain(8); // LOGGER = setup_logger()
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['def simple_function():', '    return "simple"'];

      const tree = parser.parse(lines.join('\n'));
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      const complexity = strategy.calculateComplexity(functionNode!);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        'def complex_function(param):',
        '    if param > 0:',
        '        for i in range(param):',
        '            if i % 2 == 0:',
        '                try:',
        '                    result = process_even(i)',
        '                except:',
        '                    result = process_odd(i)',
        '            elif param < 0:',
        '        while abs(param) > 0:',
        '            param += 1',
        '    return result',
      ];

      const tree = parser.parse(lines.join('\n'));
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      const complexity = strategy.calculateComplexity(functionNode!);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for decorators', () => {
      const lines = ['@retry(max_attempts=3)', '@log_execution', 'def decorated_function():', '    return "decorated"'];

      const tree = parser.parse(lines.join('\n'));
      const functionNode = tree.rootNode?.descendantsOfType('function_definition')[0];
      const complexity = strategy.calculateComplexity(functionNode!);

      // Should have higher complexity due to decorators
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        '#!/usr/bin/env python3',
        'import os',
        'import sys',
        'from typing import List',
        'class UserService:',
        '    def __init__(self):',
        '        pass',
        'def main():',
        '    pass',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      const headerLines = strategy.identifyHeaderLines(lines, tree!);

      expect(headerLines).toContain(0); // shebang
      expect(headerLines).toContain(1); // import os
      expect(headerLines).toContain(2); // import sys
      expect(headerLines).toContain(3); // from typing
      expect(headerLines).toContain(4); // class UserService:
      expect(headerLines).toContain(6); // def main():
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'def simple_function():',
        '    return "simple"',
        '',
        'async def async_function():',
        '    return "async"',
        '',
        'class UserService:',
        '    def method(self):',
        '        return "method"',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      const functions = strategy.analyzeFunctions(lines, tree!);

      expect(functions).toHaveLength(3);

      const simpleFunc = functions.find((f) => f.name === 'simple_function');
      expect(simpleFunc).toBeDefined();

      const asyncFunc = functions.find((f) => f.name === 'async_function');
      expect(asyncFunc).toBeDefined();

      const method = functions.find((f) => f.name === 'method');
      expect(method).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'import sys',
        '',
        'def helper():',
        '    return "helper"',
        '',
        'if __name__ == "__main__":',
        '    print("Hello")',
        '',
        '# Module-level code',
        'CONFIG = {"debug": True}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      const footerLines = strategy.identifyFooterLines(lines, tree!);

      expect(footerLines).toContain(4); // if __name__ == "__main__":
      expect(footerLines).toContain(5); // print("Hello")
      expect(footerLines).toContain(7); // CONFIG = {"debug": True}
    });
  });
});
