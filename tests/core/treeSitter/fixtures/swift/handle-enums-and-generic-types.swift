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
