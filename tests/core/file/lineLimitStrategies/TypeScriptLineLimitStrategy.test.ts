import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Parser } from 'web-tree-sitter';
import { TypeScriptLineLimitStrategy } from '../../../../src/core/file/lineLimitStrategies/TypeScriptLineLimitStrategy.js';
import { loadLanguage } from '../../../../src/core/treeSitter/loadLanguage.js';

describe('TypeScriptLineLimitStrategy', () => {
  let strategy: TypeScriptLineLimitStrategy;
  let parser: Parser;

  beforeEach(async () => {
    strategy = new TypeScriptLineLimitStrategy();
    parser = new Parser();
    const lang = await loadLanguage('typescript');
    parser.setLanguage(lang);
  });

  afterEach(() => {
    parser.delete();
  });

  describe('identifyHeaderLines', () => {
    test('should identify import statements', () => {
      const lines = [
        '/// <reference types="node" />',
        '',
        'import { readFileSync } from "fs";',
        'import { EventEmitter } from "events";',
        'import type { UserConfig } from "./types";',
        'import { Utils, Logger } from "./utils";',
        '',
        'export class App {',
        '  constructor() {}',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // reference directive
      expect(headerLines).toContain(2); // import { readFileSync }
      expect(headerLines).toContain(3); // import { EventEmitter }
      expect(headerLines).toContain(4); // import type
      expect(headerLines).toContain(5); // import { Utils }
    });

    test('should identify interface and type declarations', () => {
      const lines = [
        'interface User {',
        '  id: number;',
        '  name: string;',
        '}',
        '',
        'type Config = {',
        '  debug: boolean;',
        '  port: number;',
        '};',
        '',
        'enum Status {',
        '  Active = "active",',
        '  Inactive = "inactive",',
        '}',
        '',
        'class UserService {',
        '  constructor() {}',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // interface User
      expect(headerLines).toContain(5); // type Config
      expect(headerLines).toContain(10); // enum Status
      expect(headerLines).toContain(15); // class UserService
    });

    test('should identify decorators', () => {
      const lines = [
        '@Component({',
        '  selector: "app-user",',
        '  template: "<div></div>",',
        '})',
        'export class UserComponent {',
        '  @Input() user: User;',
        '',
        '  @Output() userChange = new EventEmitter<User>();',
        '',
        '  @HostBinding("class.active")',
        '  isActive = false;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // @Component
      expect(headerLines).toContain(4); // export class UserComponent
      expect(headerLines).toContain(5); // @Input
      expect(headerLines).toContain(7); // @Output
      expect(headerLines).toContain(9); // @HostBinding
    });

    test('should identify namespace and module declarations', () => {
      const lines = [
        'declare global {',
        '  interface Window {',
        '    myApp: any;',
        '  }',
        '}',
        '',
        'namespace MyLibrary {',
        '  export interface Config {',
        '    version: string;',
        '  }',
        '}',
        '',
        'module MyModule {',
        '  export function helper() {}',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // declare global
      expect(headerLines).toContain(5); // namespace MyLibrary
      expect(headerLines).toContain(11); // module MyModule
    });

    test('should handle complex import scenarios', () => {
      const lines = [
        'import * as fs from "fs";',
        'import { default as React } from "react";',
        'import { useState, useEffect } from "react";',
        'import type { ReactNode } from "react";',
        'import "./styles.css";',
        'import { config } from "./config.json";',
        '',
        'export const API_URL = "https://api.example.com";',
        '',
        'export function initialize() {',
        '  console.log("Initialized");',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // import * as fs
      expect(headerLines).toContain(1); // import { default as React }
      expect(headerLines).toContain(2); // import { useState, useEffect }
      expect(headerLines).toContain(3); // import type
      expect(headerLines).toContain(4); // import "./styles.css"
      expect(headerLines).toContain(5); // import { config }
      expect(headerLines).toContain(7); // export const API_URL
    });
  });

  describe('analyzeFunctions', () => {
    test('should analyze function declarations', () => {
      const lines = [
        'function simpleFunction(): string {',
        '  return "simple";',
        '}',
        '',
        'function complexFunction(param: string): string {',
        '  if (param) {',
        '    for (let i = 0; i < param.length; i++) {',
        '      if (param[i] === "a") {',
        '        try {',
        '          return processA(param[i]);',
        '        } catch (error) {',
        '          return "error";',
        '        }',
        '      }',
        '    }',
        '  }',
        '  return "not found";',
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

    test('should analyze arrow functions', () => {
      const lines = [
        'const simpleArrow = () => "simple";',
        '',
        'const complexArrow = (param: string): string => {',
        '  if (param) {',
        '    return param.split("").join("-");',
        '  }',
        '  return "";',
        '};',
        '',
        'const asyncArrow = async (url: string): Promise<any> => {',
        '  const response = await fetch(url);',
        '  return response.json();',
        '};',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleArrow = functions.find((f) => f.name === 'simpleArrow');
      expect(simpleArrow).toBeDefined();
      expect(simpleArrow!.complexity).toBeLessThan(0.5);

      const complexArrow = functions.find((f) => f.name === 'complexArrow');
      expect(complexArrow).toBeDefined();
      expect(complexArrow!.complexity).toBeGreaterThan(0.5);

      const asyncArrow = functions.find((f) => f.name === 'asyncArrow');
      expect(asyncArrow).toBeDefined();
      expect(asyncArrow!.complexity).toBeGreaterThan(0.5); // Should account for async/await
    });

    test('should analyze class methods', () => {
      const lines = [
        'class UserService {',
        '  private users: Map<number, User> = new Map();',
        '',
        '  constructor() {',
        '    this.loadUsers();',
        '  }',
        '',
        '  public getUser(id: number): User | undefined {',
        '    return this.users.get(id);',
        '  }',
        '',
        '  private async loadUsers(): Promise<void> {',
        '    const data = await fetch("/api/users");',
        '    const users = await data.json();',
        '    this.users = new Map(users.map((u: User) => [u.id, u]));',
        '  }',
        '',
        '  @deprecated',
        '  public legacyMethod(): string {',
        '    return "legacy";',
        '  }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(4);

      const constructor = functions.find((f) => f.name === 'constructor');
      expect(constructor).toBeDefined();

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();

      const loadUsers = functions.find((f) => f.name === 'loadUsers');
      expect(loadUsers).toBeDefined();
      expect(loadUsers!.complexity).toBeGreaterThan(0.5); // Should account for async/await

      const legacyMethod = functions.find((f) => f.name === 'legacyMethod');
      expect(legacyMethod).toBeDefined();
    });

    test('should analyze interface methods', () => {
      const lines = [
        'interface UserService {',
        '  getUser(id: number): User | undefined;',
        '  saveUser(user: User): Promise<boolean>;',
        '  deleteUser(id: number): Promise<void>;',
        '}',
        '',
        'interface Configurable {',
        '  configure(config: Config): void;',
        '  getConfig(): Config;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(5);

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();

      const saveUser = functions.find((f) => f.name === 'saveUser');
      expect(saveUser).toBeDefined();
      expect(saveUser!.complexity).toBeGreaterThan(0.5); // Should account for Promise return type

      const configure = functions.find((f) => f.name === 'configure');
      expect(configure).toBeDefined();
    });

    test('should handle generic functions', () => {
      const lines = [
        'function identity<T>(arg: T): T {',
        '  return arg;',
        '}',
        '',
        'function createArray<T>(length: number, value: T): T[] {',
        '  return Array(length).fill(value);',
        '}',
        '',
        'async function fetchApi<T>(url: string): Promise<T> {',
        '  const response = await fetch(url);',
        '  return response.json();',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const identity = functions.find((f) => f.name === 'identity');
      expect(identity).toBeDefined();
      expect(identity!.complexity).toBeLessThan(0.5);

      const createArray = functions.find((f) => f.name === 'createArray');
      expect(createArray).toBeDefined();

      const fetchApi = functions.find((f) => f.name === 'fetchApi');
      expect(fetchApi).toBeDefined();
      expect(fetchApi!.complexity).toBeGreaterThan(0.5); // Should account for async/await
    });
  });

  describe('identifyFooterLines', () => {
    test('should identify export statements', () => {
      const lines = [
        'import { User } from "./types";',
        '',
        'class UserService {',
        '  private users: User[] = [];',
        '',
        '  addUser(user: User): void {',
        '    this.users.push(user);',
        '  }',
        '}',
        '',
        'export { UserService };',
        'export { User };',
        'export default UserService;',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(9); // export { UserService }
      expect(footerLines).toContain(10); // export { User }
      expect(footerLines).toContain(11); // export default UserService
    });

    test('should identify module-level code at the end', () => {
      const lines = [
        'import { config } from "./config";',
        '',
        'function initializeApp(): void {',
        '  console.log("Initializing app...");',
        '}',
        '',
        '// Module initialization',
        'initializeApp();',
        'console.log("App initialized with config:", config);',
        '',
        'if (process.env.NODE_ENV === "development") {',
        '  console.log("Development mode");',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(6); // initializeApp()
      expect(footerLines).toContain(7); // console.log with config
      expect(footerLines).toContain(9); // if (process.env.NODE_ENV)
      expect(footerLines).toContain(10); // console.log development mode
    });

    test('should identify test code at the end', () => {
      const lines = [
        'export function calculateSum(a: number, b: number): number {',
        '  return a + b;',
        '}',
        '',
        '// Test cases',
        'if (import.meta.url === `file://${process.argv[1]}`) {',
        '  console.assert(calculateSum(2, 3) === 5);',
        '  console.assert(calculateSum(-1, 1) === 0);',
        '  console.log("All tests passed");',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(4); // Test cases comment
      expect(footerLines).toContain(5); // if (import.meta.url)
      expect(footerLines).toContain(6); // console.assert
      expect(footerLines).toContain(7); // console.assert
      expect(footerLines).toContain(8); // console.log
    });

    test('should identify configuration and setup code', () => {
      const lines = [
        'import express from "express";',
        'import { config } from "./config";',
        '',
        'const app = express();',
        '',
        'app.get("/", (req, res) => {',
        '  res.send("Hello World");',
        '});',
        '',
        '// Server setup',
        'const PORT = config.port || 3000;',
        'app.listen(PORT, () => {',
        '  console.log(`Server running on port ${PORT}`);',
        '});',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(9); // Server setup comment
      expect(footerLines).toContain(10); // const PORT
      expect(footerLines).toContain(11); // app.listen
      expect(footerLines).toContain(12); // console.log
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate base complexity', () => {
      const lines = ['function simpleFunction(): string {', '  return "simple";', '}'];

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
        'function complexFunction(param: number): number {',
        '  if (param > 0) {',
        '    for (let i = 0; i < param; i++) {',
        '      if (i % 2 === 0) {',
        '        try {',
        '          return processEven(i);',
        '        } catch (error) {',
        '          return processOdd(i);',
        '        }',
        '      } else if (param < 0) {',
        '        while (Math.abs(param) > 0) {',
        '          param += 1;',
        '        }',
        '      }',
        '    }',
        '  }',
        '  return param;',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for decorators', () => {
      const lines = [
        '@Component({',
        '  selector: "app-example",',
        '})',
        '@LogExecution',
        'function decoratedFunction(): void {',
        '  console.log("decorated");',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to decorators
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for async/await', () => {
      const lines = [
        'async function asyncFunction(url: string): Promise<any> {',
        '  try {',
        '    const response = await fetch(url);',
        '    const data = await response.json();',
        '    return data;',
        '  } catch (error) {',
        '    console.error("Error:", error);',
        '    throw error;',
        '  }',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to async/await and try/catch
      expect(complexity).toBeGreaterThan(0.5);
    });

    test('should account for generics and type complexity', () => {
      const lines = [
        'function genericFunction<T extends Record<string, any>, K extends keyof T>(',
        '  obj: T,',
        '  key: K',
        '): T[K] {',
        '  return obj[key];',
        '}',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const functionNode = tree.rootNode?.descendantsOfType('function_declaration')[0];
      if (!functionNode) throw new Error('Function node not found');
      const complexity = strategy.calculateComplexity(functionNode);

      // Should have higher complexity due to complex generic constraints
      expect(complexity).toBeGreaterThan(0.5);
    });
  });

  describe('Integration Tests', () => {
    test('should handle real-world TypeScript file', () => {
      const lines = [
        'import { Injectable } from "@angular/core";',
        'import { HttpClient } from "@angular/common/http";',
        'import { Observable, throwError } from "rxjs";',
        'import { catchError, map } from "rxjs/operators";',
        'import type { User, CreateUserRequest } from "./user.model";',
        '',
        '@Injectable({',
        '  providedIn: "root",',
        '})',
        'export class UserService {',
        '  private readonly apiUrl = "/api/users";',
        '',
        '  constructor(private http: HttpClient) {}',
        '',
        '  getUsers(): Observable<User[]> {',
        '    return this.http.get<User[]>(this.apiUrl).pipe(',
        '      catchError(this.handleError)',
        '    );',
        '  }',
        '',
        '  getUser(id: number): Observable<User> {',
        '    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(',
        '      map(user => ({ ...user, id })),',
        '      catchError(this.handleError)',
        '    );',
        '  }',
        '',
        '  createUser(user: CreateUserRequest): Observable<User> {',
        '    return this.http.post<User>(this.apiUrl, user).pipe(',
        '      catchError(this.handleError)',
        '    );',
        '  }',
        '',
        '  private handleError(error: any): Observable<never> {',
        '    console.error("UserService error:", error);',
        '    return throwError(() => new Error("UserService operation failed"));',
        '  }',
        '}',
        '',
        'export { UserService };',
      ];

      const tree = parser.parse(lines.join('\n'));
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);
      const functions = strategy.analyzeFunctions(lines, tree);
      const footerLines = strategy.identifyFooterLines(lines, tree);

      // Should identify imports and decorators in header
      expect(headerLines).toContain(0); // import { Injectable }
      expect(headerLines).toContain(1); // import { HttpClient }
      expect(headerLines).toContain(2); // import { Observable }
      expect(headerLines).toContain(3); // import { catchError, map }
      expect(headerLines).toContain(4); // import type
      expect(headerLines).toContain(7); // @Injectable
      expect(headerLines).toContain(11); // export class UserService

      // Should analyze all methods
      expect(functions).toHaveLength(5);

      const constructor = functions.find((f) => f.name === 'constructor');
      expect(constructor).toBeDefined();

      const getUsers = functions.find((f) => f.name === 'getUsers');
      expect(getUsers).toBeDefined();

      const getUser = functions.find((f) => f.name === 'getUser');
      expect(getUser).toBeDefined();
      expect(getUser!.complexity).toBeGreaterThan(0.5); // Should account for pipe and map

      const createUser = functions.find((f) => f.name === 'createUser');
      expect(createUser).toBeDefined();

      const handleError = functions.find((f) => f.name === 'handleError');
      expect(handleError).toBeDefined();

      // Should identify export in footer
      expect(footerLines).toContain(42); // export { UserService }
    });
  });

  describe('Fallback Heuristics', () => {
    test('should identify headers when parsing fails', () => {
      const lines = [
        '/// <reference types="node" />',
        'import { readFileSync } from "fs";',
        'import type { UserConfig } from "./types";',
        'interface Config {',
        '  debug: boolean;',
        '}',
        'export class App {',
        '  constructor() {}',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const headerLines = strategy.identifyHeaderLines(lines, tree);

      expect(headerLines).toContain(0); // reference directive
      expect(headerLines).toContain(1); // import
      expect(headerLines).toContain(2); // import type
      expect(headerLines).toContain(3); // interface Config
      expect(headerLines).toContain(5); // export class App
    });

    test('should analyze functions when parsing fails', () => {
      const lines = [
        'function simpleFunction(): string {',
        '  return "simple";',
        '}',
        '',
        'const arrowFunction = (param: string): string => {',
        '  return param.toUpperCase();',
        '};',
        '',
        'class TestClass {',
        '  method(): void {',
        '    console.log("method");',
        '  }',
        '}',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const functions = strategy.analyzeFunctions(lines, tree);

      expect(functions).toHaveLength(3);

      const simpleFunc = functions.find((f) => f.name === 'simpleFunction');
      expect(simpleFunc).toBeDefined();

      const arrowFunc = functions.find((f) => f.name === 'arrowFunction');
      expect(arrowFunc).toBeDefined();

      const method = functions.find((f) => f.name === 'method');
      expect(method).toBeDefined();
    });

    test('should identify footers when parsing fails', () => {
      const lines = [
        'import { config } from "./config";',
        '',
        'function initialize(): void {',
        '  console.log("Initializing...");',
        '}',
        '',
        '// Module initialization',
        'initialize();',
        'console.log("Ready:", config);',
        '',
        'export { initialize };',
      ];

      // Mock parsing failure by using empty tree
      const tree = parser.parse('');
      if (!tree) throw new Error('Failed to parse code');
      const footerLines = strategy.identifyFooterLines(lines, tree);

      expect(footerLines).toContain(6); // initialize()
      expect(footerLines).toContain(7); // console.log
      expect(footerLines).toContain(9); // export { initialize }
    });
  });
});
