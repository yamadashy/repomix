/// Status enum
enum Status {
  pending,
  active,
  completed
}

/// String extension
extension StringExtension on String {
  /// Capitalizes first letter
  String capitalize() {
    return this[0].toUpperCase() + substring(1);
  }
}

/// User class
class User {
  final String name;
  final Status status;

  /// User constructor
  User(this.name, this.status);

  /// Named constructor
  User.guest() : name = 'Guest', status = Status.pending;
}
