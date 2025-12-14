import { describe, expect, test } from 'vitest';
import { getFileManipulator } from '../../../src/core/file/fileManipulate.js';

describe('fileManipulate', () => {
  const testCases = [
    {
      name: 'C comment removal',
      ext: '.c',
      input: `
        // Single line comment
        int main() {
          /* Multi-line
             comment */
          return 0;
        }
      `,
      expected: `

        int main() {


          return 0;
        }
`,
    },
    {
      name: 'C++ header file comment removal',
      ext: '.h',
      input: `
        // Single line comment
        #ifndef MY_HEADER_H
        #define MY_HEADER_H
        /* Multi-line
           comment block */
        class MyClass {
          // Method comment
          void method();
          /**
           * Documentation comment
           */
          int value;
        };
        #endif // MY_HEADER_H
      `,
      expected: `

        #ifndef MY_HEADER_H
        #define MY_HEADER_H


        class MyClass {

          void method();



          int value;
        };
        #endif
`,
    },
    {
      name: 'C++ source file comment removal',
      ext: '.cc',
      input: `
        // Single line comment
        #include "myheader.h"
        /* Multi-line
           comment block */
        void MyClass::method() {
          // Implementation comment
          /* Another
             multi-line comment */
          int x = 0; // Inline comment
        }
      `,
      expected: `

        #include "myheader.h"


        void MyClass::method() {



          int x = 0;
        }
`,
    },
    {
      name: 'C++ .cpp file comment removal',
      ext: '.cpp',
      input: `
        // Single line comment
        #include <iostream>
        /* Multi-line
           comment block */
        int main() {
          // Implementation comment
          std::cout << "Hello, world!" << std::endl; // Inline comment
          /* Another
             multi-line comment */
          return 0;
        }
      `,
      expected: `

        #include <iostream>


        int main() {

          std::cout << "Hello, world!" << std::endl;


          return 0;
        }
`,
    },
    {
      name: 'C++ .hpp file comment removal',
      ext: '.hpp',
      input: `
        // Single line comment
        #pragma once
        /* Multi-line
           comment block */
        namespace test {
          // Class comment
          template <typename T>
          class Test {
            /**
             * Documentation comment
             */
            public:
              T value;
          };
        } // namespace test
      `,
      expected: `

        #pragma once


        namespace test {

          template <typename T>
          class Test {



            public:
              T value;
          };
        }
`,
    },
    {
      name: 'C# comment removal',
      ext: '.cs',
      input: `
        // Single line comment
        public class Test {
          /* Multi-line
             comment */
          public void Method() {}
        }
      `,
      expected: `

        public class Test {


          public void Method() {}
        }
`,
    },
    {
      name: 'CSS comment removal',
      ext: '.css',
      input: `
        /* Comment */
        body {
          color: red; /* Inline comment */
        }
      `,
      expected: `

        body {
          color: red;
        }
`,
    },
    {
      name: 'HTML comment removal',
      ext: '.html',
      input: '<div><!-- Comment -->Content</div>',
      expected: '<div>Content</div>',
    },
    {
      name: 'Java comment removal',
      ext: '.java',
      input: `
        // Single line comment
        public class Test {
          /* Multi-line
             comment */
          public void method() {}
        }
      `,
      expected: `

        public class Test {


          public void method() {}
        }
`,
    },
    {
      name: 'JavaScript comment removal',
      ext: '.js',
      input: `
        // Single line comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
      `,
      expected: `

        function test() {


          return true;
        }
`,
    },
    {
      name: 'Less comment removal',
      ext: '.less',
      input: `
        // Single line comment
        @variable: #888;
        /* Multi-line
           comment */
        body { color: @variable; }
      `,
      expected: `

        @variable: #888;


        body { color: @variable; }
`,
    },
    {
      name: 'PHP comment removal',
      ext: '.php',
      input: `
        <?php
        // Single line comment
        # Another single line comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
        ?>
      `,
      expected: `
        <?php


        function test() {


          return true;
        }
        ?>
`,
    },
    {
      name: 'Python comment, docstring removal',
      ext: '.py',
      input: `
        # Single line comment
        def test():
          '''
          docstring
          '''
          return True
        """
        Another docstring
        """
      `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `

        def test():



          return True



`,
    },
    {
      name: 'Python docstring removal mixing string declaration',
      ext: '.py',
      input: `
        var = """
        string variable
        """
        """
        docstring
        """
      `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `
        var = """
        string variable
        """



`,
    },
    {
      name: 'Python comment f-string is not removed',
      ext: '.py',
      input: `
        # Single line comment
        def test():
          f'f-string'
          f"""
          f-string
          """
          return True
      `,
      expected: `

        def test():
          f'f-string'
          f"""
          f-string
          """
          return True
`,
    },
    {
      name: 'Python comment multi-line string literal is not removed',
      ext: '.py',
      input: `
        def test():
          hoge = """
          multi-line
          string
          """
          return True
      `,
      expected: `
        def test():
          hoge = """
          multi-line
          string
          """
          return True
`,
    },
    {
      name: 'Python nested quotes',
      ext: '.py',
      input: `
        """
        '''
        docstring
        '''
        """
      `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `





`,
    },
    {
      name: 'Python nested triple quotes with different types',
      ext: '.py',
      input: `
      def func():
        """
        Outer docstring
        '''
        Inner single quotes
        '''
        Still in outer docstring
        """
        return True
    `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `
      def func():







        return True
`,
    },
    {
      name: 'Python inline comments',
      ext: '.py',
      input: `
      x = 5  # This is an inline comment
      y = 10  # Another inline comment
      z = x + y
    `,
      expected: `
      x = 5
      y = 10
      z = x + y
`,
    },
    {
      name: 'Python multi-line statement with string',
      ext: '.py',
      input: `
      long_string = "This is a long string that spans " \\
                    "multiple lines in the code, " \\
                    "but is actually a single string"
      # Comment after multi-line statement
    `,
      expected: `
      long_string = "This is a long string that spans " \\
                    "multiple lines in the code, " \\
                    "but is actually a single string"

`,
    },
    {
      name: 'Python docstring with triple quotes inside string literals',
      ext: '.py',
      input: `
      def func():
        """This is a docstring"""
        x = "This is not a docstring: '''"
        y = '"""This is also not a docstring: """'
        return x + y
    `,
      expected: `
      def func():

        x = "This is not a docstring: '''"
        y = '"""This is also not a docstring: """'
        return x + y
`,
    },
    {
      name: 'Python mixed comments and docstrings',
      ext: '.py',
      input: `
      # This is a comment
      def func():
        '''
        This is a docstring
        '''
        x = 5  # Inline comment
        """
        This is another docstring
        """
        # Another comment
        return x
    `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `

      def func():



        x = 5




        return x
`,
    },
    {
      name: 'Python f-strings with triple quotes',
      ext: '.py',
      input: `
      x = 10
      y = 20
      f"""
      This f-string contains a calculation: {x + y}
      """
      # Comment after f-string
    `,
      expected: `
      x = 10
      y = 20
      f"""
      This f-string contains a calculation: {x + y}
      """

`,
    },
    {
      name: 'Python escaped hash in string',
      ext: '.py',
      input: `
      text = "This string contains an # escaped hash"
      # This is a real comment
    `,
      expected: `
      text = "This string contains an # escaped hash"

`,
    },
    {
      name: 'Python nested function with docstrings',
      ext: '.py',
      input: `
      def outer():
        """Outer docstring"""
        def inner():
          """Inner docstring"""
          pass
        return inner
    `,
      expected: `
      def outer():

        def inner():

          pass
        return inner
`,
    },
    {
      name: 'Python comment-like content in string',
      ext: '.py',
      input: `
      x = "This is not a # comment"
      y = 'Neither is this # comment'
      z = """
      This is not a # comment
      Neither is this # comment
      """
    `,
      expected: `
      x = "This is not a # comment"
      y = 'Neither is this # comment'
      z = """
      This is not a # comment
      Neither is this # comment
      """
`,
    },
    {
      name: 'Python docstring with backslashes',
      ext: '.py',
      input: `
      def func():
        """
        This docstring has \\ backslashes
        It shouldn't \\""" confuse the parser
        """
        return True
    `,
      // preserveNewlines keeps newlines for line number preservation
      expected: `
      def func():




        return True
`,
    },
    {
      name: 'Python mixed single and double quotes',
      ext: '.py',
      input: `
      x = '""""'  # This is not a docstring start
      y = "'''"  # Neither is this
      """But this is a docstring"""
    `,
      expected: `
      x = '""""'
      y = "'''"

`,
    },
    {
      name: 'Ruby comment removal',
      ext: '.rb',
      input: `
        # Single line comment
        def test
          =begin
          Multi-line comment
          =end
          true
        end
      `,
      expected: `

        def test



          true
        end
`,
    },
    {
      name: 'Sass comment removal',
      ext: '.sass',
      input: `
        // Single line comment
        $variable: #888
        /* Multi-line
           comment */
        body
          color: $variable
      `,
      expected: `

        $variable: #888


        body
          color: $variable
`,
    },
    {
      name: 'SCSS comment removal',
      ext: '.scss',
      input: `
        // Single line comment
        $variable: #888;
        /* Multi-line
           comment */
        body { color: $variable; }
      `,
      expected: `

        $variable: #888;


        body { color: $variable; }
`,
    },
    {
      name: 'SQL comment removal',
      ext: '.sql',
      input: `
        -- Single line comment
        SELECT * FROM table WHERE id = 1;
      `,
      expected: `

        SELECT * FROM table WHERE id = 1;
`,
    },
    {
      name: 'Swift comment removal',
      ext: '.swift',
      input: `
        // Single line comment
        func test() {
          /* Multi-line
             comment */
          return true
        }
      `,
      expected: `

        func test() {


          return true
        }
`,
    },
    {
      name: 'TypeScript comment removal',
      ext: '.ts',
      input: `
        // Single line comment
        function test(): boolean {
          /* Multi-line
             comment */
          return true;
        }
      `,
      expected: `

        function test(): boolean {


          return true;
        }
`,
    },
    {
      name: 'XML comment removal',
      ext: '.xml',
      input: '<root><!-- Comment --><element>Content</element></root>',
      expected: '<root><element>Content</element></root>',
    },
    {
      name: 'Dart comment removal',
      ext: '.dart',
      input: `
        // Single line comment
        void main() {
          /* Multi-line
             comment */
          print('Hello');
        }
      `,
      expected: `

        void main() {


          print('Hello');
        }
`,
    },
    {
      name: 'Go comment removal',
      ext: '.go',
      input: `
        // Single line comment
        func main() {
          /* Multi-line
             comment */
          fmt.Println("Hello")
        }
      `,
      expected: `

        func main() {


          fmt.Println("Hello")
        }
`,
    },
    {
      name: 'Go directives preservation',
      ext: '.go',
      input: `//go:build linux
//go:generate something

package main

import "fmt"

func main() {
    // Regular comment
    s1 := "String with // not a comment"
    s2 := \`raw string with
    // this is not a comment
    /* neither is this */\`

    r := '/' // rune literal

    /*
    Multi-line comment
    */

    fmt.Println("Hello") // end of line comment
}`,
      expected: `//go:build linux
//go:generate something

package main

import "fmt"

func main() {

    s1 := "String with // not a comment"
    s2 := \`raw string with
    // this is not a comment
    /* neither is this */\`

    r := '/'





    fmt.Println("Hello")
}`,
    },
    {
      name: 'Go mixed directives and comments',
      ext: '.go',
      input: `//go:build linux
// This is a comment, not a directive
//go:generate stringer -type=Color
// Another comment
package main`,
      expected: `//go:build linux

//go:generate stringer -type=Color

package main`,
    },
    {
      name: 'Go string literals with comments',
      ext: '.go',
      input: `s := "This is a string with \\"escaped\\" quotes // not a comment"
// This is a comment
r1 := '\\''  // Escaped single quote
r2 := '\\\\'  // Backslash`,
      expected: `s := "This is a string with \\"escaped\\" quotes // not a comment"

r1 := '\\''
r2 := '\\\\'`,
    },
    {
      name: 'Kotlin comment removal',
      ext: '.kt',
      input: `
        // Single line comment
        fun main() {
          /* Multi-line
             comment */
          println("Hello")
        }
      `,
      expected: `

        fun main() {


          println("Hello")
        }
`,
    },
    {
      name: 'Rust comment removal',
      ext: '.rs',
      input: `
        // Single line comment
        fn main() {
          /* Multi-line
             comment */
          println!("Hello");
        }
      `,
      expected: `

        fn main() {


          println!("Hello");
        }
`,
    },
    {
      name: 'Shell script comment removal',
      ext: '.sh',
      input: `
        # Single line comment
        echo "Hello"
      `,
      expected: `

        echo "Hello"
`,
    },
    {
      name: 'YAML comment removal',
      ext: '.yml',
      input: `
        key: value  # Comment
        another_key: another_value
      `,
      expected: `
        key: value
        another_key: another_value
`,
    },
    {
      name: 'Vue file comment removal',
      ext: '.vue',
      input: `
        <template>
          <!-- HTML comment -->
          <div>{{ message }}</div>
        </template>
        <script>
        // JavaScript comment
        export default {
          data() {
            return {
              message: 'Hello'
            }
          }
        }
        </script>
        <style>
        /* CSS comment */
        .test { color: red; }
        </style>
      `,
      expected: `
        <template>

          <div>{{ message }}</div>
        </template>
        <script>

        export default {
          data() {
            return {
              message: 'Hello'
            }
          }
        }
        </script>
        <style>

        .test { color: red; }
        </style>
`,
    },
    {
      name: 'Svelte file comment removal',
      ext: '.svelte',
      input: `
        <!-- HTML comment -->
        <div>{message}</div>
        <script>
        // JavaScript comment
        let message = 'Hello';
        </script>
        <style>
        /* CSS comment */
        div { color: red; }
        </style>
      `,
      expected: `

        <div>{message}</div>
        <script>

        let message = 'Hello';
        </script>
        <style>

        div { color: red; }
        </style>
`,
    },
    {
      name: 'C++ triple slash comment removal (.cpp)',
      ext: '.cpp',
      input: `
        /// Triple slash documentation comment
        #include <iostream>
        // Single line comment
        int main() {
          std::cout << "Hello, world!" << std::endl; /// Inline triple slash comment
          return 0; // Normal comment
        }
      `,
      expected: `

        #include <iostream>

        int main() {
          std::cout << "Hello, world!" << std::endl;
          return 0;
        }
`,
    },
    {
      name: 'C++ triple slash comment removal (.hpp)',
      ext: '.hpp',
      input: `
        /// Class documentation with triple slash
        class Test {
          public:
            /// Method documentation
            void method();
            int value; /// Variable documentation
        };
      `,
      expected: `

        class Test {
          public:

            void method();
            int value;
        };
`,
    },
    {
      name: 'C++ triple slash comment removal',
      ext: '.cpp',
      input: `
        /// This is a triple slash comment.\n        int foo = 1; /// Another triple slash comment.\n// Regular single line comment\n/* Multi-line\n   comment */\nint bar = 2; /// Comment with trailing spaces  \n`,
      expected: `

        int foo = 1;\n\n\n\nint bar = 2;\n`,
    },
  ];

  for (const { name, ext, input, expected } of testCases) {
    test(name, () => {
      const manipulator = getFileManipulator(`test${ext}`);
      expect(manipulator?.removeComments(input)).toBe(expected);
    });
  }

  test('Unsupported file type', () => {
    const manipulator = getFileManipulator('test.unsupported');
    expect(manipulator).toBeNull();
  });
});
