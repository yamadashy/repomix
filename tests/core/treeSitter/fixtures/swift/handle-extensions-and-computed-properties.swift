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
