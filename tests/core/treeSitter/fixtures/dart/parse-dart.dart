/// A simple greeting class
class Greeter {
  /// The name to greet
  final String name;

  /// Constructor
  Greeter(this.name);

  /// Prints a greeting message
  void greet() {
    print('Hello, $name!');
  }

  /// Returns a greeting message
  String getMessage() {
    return 'Hello, $name!';
  }
}

/// Main entry point
void main() {
  final greeter = Greeter('World');
  greeter.greet();
}
