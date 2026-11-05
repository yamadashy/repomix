class Config {
  /// Default port
  static const int defaultPort = 8080;

  /// Host name
  final String host;

  /// Lazily resolved address
  late String address;

  int? timeout;

  Config(this.host);

  void connect() {
    final socket = open(host);
    int retries = 3;
  }
}
