/// JSON map alias
typedef Json = Map<String, dynamic>;

/// Walker mixin
mixin Walker on Animal {
  /// Walk action
  void walk() {
    print('walking');
  }
}

/// Animal base class
class Animal {
  final String _name;

  Animal(this._name);

  /// Animal name getter
  String get name => _name;

  /// Animal name setter
  set nickname(String value) {
    print('nickname is $value');
  }

  /// Factory constructor
  factory Animal.guest() {
    return Animal('Guest');
  }

  /// Redirecting factory
  factory Animal.copy(Animal other) = Animal;
}
