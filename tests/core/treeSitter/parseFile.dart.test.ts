import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

describe('parseFile for Dart', () => {
  test('should parse Dart correctly', async () => {
    const fileContent = `
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
    `;
    const filePath = 'dummy.dart';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '/// A simple greeting class',
      'class Greeter {',
      '/// The name to greet',
      '/// Constructor',
      '/// Prints a greeting message',
      'void greet() {',
      '/// Returns a greeting message',
      'String getMessage() {',
      '/// Main entry point',
      'void main() {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse Dart with imports correctly', async () => {
    const fileContent = `
      import 'dart:async';
      import 'package:flutter/material.dart';

      /// A simple widget
      class MyWidget extends StatelessWidget {
        @override
        Widget build(BuildContext context) {
          return Container();
        }
      }
    `;
    const filePath = 'dummy.dart';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      "import 'dart:async';",
      "import 'package:flutter/material.dart';",
      '/// A simple widget',
      'class MyWidget extends StatelessWidget {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse Dart with enum, extension, and constructor', async () => {
    const fileContent = `
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
    `;
    const filePath = 'dummy.dart';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '/// Status enum',
      'enum Status {',
      '/// String extension',
      'extension StringExtension on String {',
      '/// Capitalizes first letter',
      'String capitalize() {',
      '/// User class',
      'class User {',
      '/// User constructor',
      '/// Named constructor',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse Dart mixin, typedef, getter, setter, and factory', async () => {
    const fileContent = `
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
    `;
    const filePath = 'dummy.dart';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '/// JSON map alias',
      'typedef Json = Map<String, dynamic>;',
      '/// Walker mixin',
      'mixin Walker on Animal {',
      '/// Walk action',
      'void walk() {',
      '/// Animal name getter',
      'String get name => _name;',
      '/// Animal name setter',
      'set nickname(String value) {',
      '/// Factory constructor',
      'factory Animal.guest() {',
      '/// Redirecting factory',
      'factory Animal.copy(Animal other) = Animal;',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
