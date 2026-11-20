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
print("Total area: \(totalArea)")
