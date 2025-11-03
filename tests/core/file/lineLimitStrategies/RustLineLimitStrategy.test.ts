import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { RustLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/RustLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('RustLineLimitStrategy', () => {
  let strategy: RustLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new RustLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('rust');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify use statements and attributes', () => {
      const lines = [
        'use std::collections::HashMap;',
        'use std::fs::File;',
        'use std::io::{self, Read};',
        'use serde::{Deserialize, Serialize};',
        '',
        '#[derive(Debug, Clone)]',
        '#[serde(rename_all = "camelCase")]',
        'pub struct User {',
        '    pub id: u32,',
        '    pub name: String,',
        '}',
        '',
        '#[tokio::main]',
        'async fn main() -> Result<(), Box<dyn std::error::Error>> {',
        '    Ok(())',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // use std::collections
      expect(headerLines).toContain(1); // use std::fs::File
      expect(headerLines).toContain(2); // use std::io
      expect(headerLines).toContain(3); // use serde
      expect(headerLines).toContain(5); // #[derive(Debug, Clone)]
      expect(headerLines).toContain(6); // #[serde(rename_all)]
      expect(headerLines).toContain(7); // pub struct User
      expect(headerLines).toContain(12); // #[tokio::main]
      expect(headerLines).toContain(13); // async fn main
    });

    test('should identify mod and trait declarations', () => {
      const lines = [
        'mod utils;',
        'mod config;',
        'mod models;',
        '',
        'pub trait Repository<T> {',
        '    fn find(&self, id: u32) -> Option<T>;',
        '    fn save(&mut self, item: T) -> Result<(), Error>;',
        '    fn delete(&mut self, id: u32) -> Result<(), Error>;',
        '}',
        '',
        'pub trait Service {',
        "    type Error: std::error::Error + Send + Sync + 'static;",
        '    fn initialize(&mut self) -> Result<(), Self::Error>;',
        '}',
        '',
        'pub enum Status {',
        '    Active,',
        '    Inactive,',
        '    Pending,',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // mod utils
      expect(headerLines).toContain(1); // mod config
      expect(headerLines).toContain(2); // mod models
      expect(headerLines).toContain(4); // pub trait Repository
      expect(headerLines).toContain(11); // pub trait Service
      expect(headerLines).toContain(16); // pub enum Status
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function definitions', () => {
      const lines = [
        'fn simple_function() -> i32 {',
        '    42',
        '}',
        '',
        'fn complex_function(param: i32) -> i32 {',
        '    if param > 0 {',
        '        for i in 0..param {',
        '            if i % 2 == 0 {',
        '                match process_even(i) {',
        '                    Ok(result) => return result,',
        '                    Err(e) => return -1,',
        '                }',
        '            }',
        '        }',
        '    }',
        '    param',
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

    test('should analyze impl blocks and methods', () => {
      const lines = [
        'pub struct UserService {',
        '    users: HashMap<u32, User>,',
        '}',
        '',
        'impl UserService {',
        '    pub fn new() -> Self {',
        '        Self {',
        '            users: HashMap::new(),',
        '        }',
        '    }',
        '',
        '    pub fn get_user(&self, id: u32) -> Option<&User> {',
        '        self.users.get(&id)',
        '    }',
        '',
        '    pub async fn save_user(&mut self, user: User) -> Result<(), Error> {',
        '        self.users.insert(user.id, user);',
        '        Ok(())',
        '    }',
        '}',
        '',
        'impl Drop for UserService {',
        '    fn drop(&mut self) {',
        '        println!("Dropping UserService");',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const newMethod = functions.find((f) => f.name === 'new');
      expect(newMethod).toBeDefined();

      const getUserMethod = functions.find((f) => f.name === 'get_user');
      expect(getUserMethod).toBeDefined();

      const saveUserMethod = functions.find((f) => f.name === 'save_user');
      expect(saveUserMethod).toBeDefined();
      expect(saveUserMethod!.complexity).toBeGreaterThan(0.5); // Should account for async

      const dropMethod = functions.find((f) => f.name === 'drop');
      expect(dropMethod).toBeDefined();
    });

    test('should analyze trait implementations', () => {
      const lines = [
        'pub trait Repository {',
        '    fn find(&self, id: u32) -> Option<User>;',
        '    fn save(&mut self, user: User) -> Result<(), Error>;',
        '}',
        '',
        'pub struct UserRepository {',
        '    users: HashMap<u32, User>,',
        '}',
        '',
        'impl Repository for UserRepository {',
        '    fn find(&self, id: u32) -> Option<User> {',
        '        self.users.get(&id).cloned()',
        '    }',
        '',
        '    fn save(&mut self, user: User) -> Result<(), Error> {',
        '        self.users.insert(user.id, user.clone());',
        '        Ok(())',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const findMethod = functions.find((f) => f.name === 'find');
      expect(findMethod).toBeDefined();

      const saveMethod = functions.find((f) => f.name === 'save');
      expect(saveMethod).toBeDefined();
    });

    test('should analyze closures and async functions', () => {
      const lines = [
        'async fn process_data(data: Vec<i32>) -> Result<i32, Error> {',
        '    let sum = data.iter().fold(0, |acc, x| acc + x);',
        '    ',
        '    let doubled = data.into_iter().map(|x| {',
        '        async move {',
        '            x * 2',
        '        }',
        '    });',
        '    ',
        '    let results: Vec<i32> = futures::future::join_all(doubled).await?',
        '    Ok(results.iter().sum())',
        '}',
        '',
        'fn create_multiplier(factor: i32) -> impl Fn(i32) -> i32 {',
        '    move |x| x * factor',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(2);

      const processData = functions.find((f) => f.name === 'process_data');
      expect(processData).toBeDefined();
      expect(processData!.complexity).toBeGreaterThan(0.5); // Should account for async and closures

      const createMultiplier = functions.find((f) => f.name === 'create_multiplier');
      expect(createMultiplier).toBeDefined();
      expect(createMultiplier!.complexity).toBeGreaterThan(0.5); // Should account for closure
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify main function', () => {
      const lines = [
        'use std::io;',
        '',
        'fn helper() {',
        '    println!("Helper function");',
        '}',
        '',
        'fn main() {',
        '    println!("Starting program");',
        '    helper();',
        '    println!("Program finished");',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(5); // fn main
      expect(footerLines).toContain(6); // println!
      expect(footerLines).toContain(7); // helper()
      expect(footerLines).toContain(8); // println!
    });

    test('should identify tests and examples', () => {
      const lines = [
        'pub struct Calculator {',
        '    value: i32,',
        '}',
        '',
        'impl Calculator {',
        '    pub fn add(&mut self, x: i32) {',
        '        self.value += x;',
        '    }',
        '}',
        '',
        '#[cfg(test)]',
        'mod tests {',
        '    use super::*;',
        '    ',
        '    #[test]',
        '    fn test_add() {',
        '        let mut calc = Calculator { value: 0 };',
        '        calc.add(5);',
        '        assert_eq!(calc.value, 5);',
        '    }',
        '}',
        '',
        '#[cfg(feature = "examples")]',
        'fn main() {',
        '    let mut calc = Calculator { value: 10 };',
        '    calc.add(5);',
        '    println!("Result: {}", calc.value);',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(13); // #[cfg(test)]
      expect(footerLines).toContain(14); // mod tests
      expect(footerLines).toContain(16); // #[test]
      expect(footerLines).toContain(17); // fn test_add
      expect(footerLines).toContain(22); // #[cfg(feature = "examples")]
      expect(footerLines).toContain(23); // fn main
      expect(footerLines).toContain(24); // let mut calc
      expect(footerLines).toContain(25); // calc.add(5)
      expect(footerLines).toContain(26); // println!
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['fn simple_function() -> i32 {', '    42', '}'];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_item')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThan(0.5);
    });

    test('should increase complexity for control structures', () => {
      const lines = [
        'fn complex_function(param: i32) -> i32 {',
        '    match param {',
        '        0 => 0,',
        '        1 => 1,',
        '        x if x > 0 => {',
        '            if x % 2 == 0 {',
        '                x * 2',
        '            } else {',
        '                x * 3',
        '            }',
        '        },',
        '        _ => -1,',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_item')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for async and await', () => {
      const lines = [
        'async fn async_function() -> Result<i32, Error> {',
        '    let result1 = async_operation().await?;',
        '    let result2 = async_operation().await?;',
        '    Ok(result1 + result2)',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_item')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to async/await
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for closures and lifetimes', () => {
      const lines = [
        'fn closure_function() -> impl Fn(i32) -> i32 {',
        '    |x| {',
        '        let y = x;',
        '        move || y * 2',
        '    }',
        '}',
        '',
        'fn lifetime_function(data: &str) -> &str {',
        '    if data.is_empty() {',
        '        "empty"',
        '    } else {',
        '        data',
        '    }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_item')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to closures and lifetimes
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        'use std::collections::HashMap;',
        'use serde::Deserialize;',
        'pub struct User {',
        '    pub id: u32,',
        '}',
        'fn main() {',
        '    println!("Hello");',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // use
      expect(headerLines).toContain(1); // use
      expect(headerLines).toContain(2); // pub struct User
      expect(headerLines).toContain(5); // fn main
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'fn simple_function() -> i32 {',
        '    42',
        '}',
        '',
        'async fn async_function() -> Result<i32, Error> {',
        '    Ok(42)',
        '}',
        '',
        'impl SomeStruct {',
        '    pub fn method(&self) -> String {',
        '        "method".to_string()',
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

      const asyncFunc = functions.find((f) => f.name === 'async_function');
      expect(asyncFunc).toBeDefined();
      expect(asyncFunc!.complexity).toBeGreaterThan(0.5);

      const method = functions.find((f) => f.name === 'method');
      expect(method).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'use std::io;',
        'fn helper() {',
        '    println!("helper");',
        '}',
        'fn main() {',
        '    println!("main");',
        '    helper();',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // fn main
      expect(footerLines).toContain(5); // println!
      expect(footerLines).toContain(6); // helper()
    });
  });
});
