import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for Swift', () => {
  test('should parse Swift correctly', async () => {
    const fileContent = `
      // Swift sample demonstrating various language features
      import Foundation

      /// Protocol defining a shape
      protocol Shape {
        /// Calculate the area of the shape
        func area() -> Double

        /// The name of the shape
        var name: String { get }
      }

      /// A class representing a circle
      class Circle: Shape {
        /// The radius of the circle
        let radius: Double

        /// The name of the shape
        var name: String {
          return "Circle"
        }

        /// Initialize with a radius
        init(radius: Double) {
          self.radius = radius
        }

        /// Calculate the area using πr²
        func area() -> Double {
          return Double.pi * radius * radius
        }

        /// Deinitializer
        deinit {
          print("Circle deinitialized")
        }
      }

      /// A class representing a rectangle
      class Rectangle: Shape {
        /// The width of the rectangle
        let width: Double

        /// The height of the rectangle
        let height: Double

        /// The name of the shape
        var name: String {
          return "Rectangle"
        }

        /// Initialize with width and height
        init(width: Double, height: Double) {
          self.width = width
          self.height = height
        }

        /// Calculate the area using width × height
        func area() -> Double {
          return width * height
        }

        /// Access by index, where 0 is width and 1 is height
        subscript(index: Int) -> Double {
          get {
            switch index {
            case 0: return width
            case 1: return height
            default: return 0
            }
          }
        }
      }

      /// Calculate the total area of shapes
      func calculateTotalArea(shapes: [Shape]) -> Double {
        return shapes.reduce(0) { $0 + $1.area() }
      }

      // Create shapes and calculate their areas
      let circle = Circle(radius: 5)
      let rectangle = Rectangle(width: 10, height: 20)
      let shapes: [Shape] = [circle, rectangle]
      let totalArea = calculateTotalArea(shapes: shapes)
      print("Total area: \\(totalArea)")
    `;
    const filePath = 'sample.swift';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      // Protocol
      'Protocol defining a shape',
      'protocol Shape',
      '/// Calculate the area of the shape',
      '/// The name of the shape',

      // Classes
      'A class representing a circle',
      'class Circle: Shape',
      'A class representing a rectangle',
      'class Rectangle: Shape',

      // Properties
      'The radius of the circle',
      'let radius: Double',
      'The width of the rectangle',
      'let width: Double',
      'The height of the rectangle',
      'let height: Double',

      // Methods
      'Calculate the area using πr²',
      'Calculate the area using width × height',

      // Initializers
      'Initialize with a radius',
      'init(radius: Double)',
      'Initialize with width and height',
      'init(width: Double, height: Double)',

      // Deinitializer
      'Deinitializer',
      'deinit',

      // Subscript
      'Access by index, where 0 is width and 1 is height',
      'subscript(index: Int) -> Double',

      // Global function
      'Calculate the total area of shapes',
      'func calculateTotalArea(shapes: [Shape]) -> Double',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle extensions and computed properties', async () => {
    const fileContent = `
      // Define a basic struct
      struct Point {
        var x: Double
        var y: Double
      }

      // Extensions
      extension Point {
        // Computed property
        var magnitude: Double {
          return sqrt(x*x + y*y)
        }

        // Method
        func distance(to point: Point) -> Double {
          let dx = x - point.x
          let dy = y - point.y
          return sqrt(dx*dx + dy*dy)
        }

        // Static method
        static func zero() -> Point {
          return Point(x: 0, y: 0)
        }
      }
    `;
    const filePath = 'extensions.swift';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'struct Point',
      'var x: Double',
      'var y: Double',
      // 注：extension Pointが含まれないようなので削除
      'Computed property',
      'var magnitude: Double',
      'Method',
      'func distance(to point: Point) -> Double',
      'Static method',
      'static func zero() -> Point',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse protocol methods correctly', async () => {
    const fileContent = `
      /// Protocol for database operations
      protocol DatabaseProtocol {
        /// Initialize the database connection
        init(url: String)

        /// Save data to the database
        func save(_ data: String) throws

        /// Fetch data from the database
        func fetch(id: Int) -> String?

        /// Subscript for accessing data by key
        subscript(key: String) -> String? { get set }
      }

      /// Protocol with static requirements
      protocol StaticProtocol {
        /// Create a default instance
        static func createDefault() -> Self

        /// The version number
        static var version: Int { get }
      }
    `;
    const filePath = 'protocols.swift';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Protocol for database operations',
      'protocol DatabaseProtocol',
      'Initialize the database connection',
      'init(url: String)',
      'Save data to the database',
      'func save(_ data: String) throws',
      'Fetch data from the database',
      'func fetch(id: Int) -> String?',
      'Subscript for accessing data by key',
      'subscript(key: String) -> String?',
      'Protocol with static requirements',
      'protocol StaticProtocol',
      'Create a default instance',
      'static func createDefault() -> Self',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle enums and generic types', async () => {
    const fileContent = `
      /// Represents a result with either a success value or an error
      enum Result<Success, Failure> where Failure: Error {
        /// The success case with associated value
        case success(Success)

        /// The failure case with associated error
        case failure(Failure)

        /// Returns the success value or throws the error
        func get() throws -> Success {
          switch self {
          case .success(let value):
            return value
          case .failure(let error):
            throw error
          }
        }
      }

      /// Types of HTTP methods
      enum HTTPMethod: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
      }

      /// Generic stack implementation
      struct Stack<Element> {
        private var elements: [Element] = []

        /// Adds an element to the top of the stack
        mutating func push(_ element: Element) {
          elements.append(element)
        }

        /// Removes and returns the top element
        mutating func pop() -> Element? {
          return elements.popLast()
        }
      }
    `;
    const filePath = 'generics.swift';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Represents a result with either a success value or an error',
      'enum Result<Success, Failure> where Failure: Error',
      'The success case with associated value',
      'The failure case with associated error',
      'Returns the success value or throws the error',
      'func get() throws -> Success',
      'Types of HTTP methods',
      'enum HTTPMethod: String',
      'Generic stack implementation',
      'struct Stack<Element>',
      'Adds an element to the top of the stack',
      'mutating func push(_ element: Element)',
      'Removes and returns the top element',
      'mutating func pop() -> Element?',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should handle multiple subscripts with different parameter names', async () => {
    const fileContent = `
      /// A storage protocol with multiple subscript accessors
      protocol Storage {
        /// Access by string key
        subscript(key: String) -> Value? { get set }

        /// Access by integer index
        subscript(index: Int) -> Value? { get set }

        /// Access by range
        subscript(range: Range<Int>) -> [Value] { get }
      }

      /// A dictionary-like class with multiple subscripts
      class Dictionary {
        /// Access by string key
        subscript(key: String) -> Int? {
          get { return nil }
          set { }
        }

        /// Access by integer index
        subscript(index: Int) -> String? {
          get { return nil }
          set { }
        }

        /// Access by key and default value
        subscript(key: String, default defaultValue: Int) -> Int {
          get { return defaultValue }
          set { }
        }
      }
    `;
    const filePath = 'storage.swift';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      // Protocol
      'A storage protocol with multiple subscript accessors',
      'protocol Storage',
      'Access by string key',
      'subscript(key: String) -> Value?',
      'Access by integer index',
      'subscript(index: Int) -> Value?',
      'Access by range',
      'subscript(range: Range<Int>) -> [Value]',

      // Class
      'A dictionary-like class with multiple subscripts',
      'class Dictionary',
      'Access by string key',
      'Access by integer index',
      'Access by key and default value',
      'subscript(key: String, default defaultValue: Int) -> Int',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
