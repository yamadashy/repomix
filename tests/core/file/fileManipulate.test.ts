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
      name: 'CSS unquoted URL is not treated as a line comment',
      ext: '.css',
      input: `
        @import url(https://fonts.example.com/css?family=Inter);
        .logo {
          background: url(http://example.com/logo.png); /* Logo */
          content: "/* not a comment */";
        }
      `,
      expected: `
        @import url(https://fonts.example.com/css?family=Inter);
        .logo {
          background: url(http://example.com/logo.png);
          content: "/* not a comment */";
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
      name: 'Shell parameter expansion is not treated as a comment',
      ext: '.sh',
      input: `base=\${name##*/}
ext=\${name#*.}
count=$#
echo "value # not a comment"
grep '# literal' file
value=1  # real comment`,
      expected: `base=\${name##*/}
ext=\${name#*.}
count=$#
echo "value # not a comment"
grep '# literal' file
value=1`,
    },
    {
      name: 'YAML unquoted hash in value is preserved',
      ext: '.yaml',
      input: `repo: https://github.com/a/b#readme
color: "#ff0000"
name: value  # trailing comment
# full line comment
plain: keep#this`,
      expected: `repo: https://github.com/a/b#readme
color: "#ff0000"
name: value

plain: keep#this`,
    },
    {
      name: 'Shell heredoc body is preserved verbatim',
      ext: '.sh',
      input: `cat <<'EOF'
# not a comment, this is heredoc content
value # also literal
EOF
echo done  # real comment`,
      expected: `cat <<'EOF'
# not a comment, this is heredoc content
value # also literal
EOF
echo done`,
    },
    {
      name: 'YAML block scalar body is preserved verbatim',
      ext: '.yaml',
      input: `message: |
  # not a comment
  keep # this too
summary: value  # real comment`,
      expected: `message: |
  # not a comment
  keep # this too
summary: value`,
    },
    {
      name: 'YAML apostrophe in plain scalar does not disable comment stripping',
      ext: '.yaml',
      input: `note: it's fine  # trailing comment
next: value  # another comment`,
      expected: `note: it's fine
next: value`,
    },
    {
      name: 'YAML plain scalar ending in pipe is not treated as a block scalar',
      ext: '.yaml',
      input: `filter: a |
  nested: value  # real comment`,
      expected: `filter: a |
  nested: value`,
    },
    {
      name: 'Shell command substitution, case pattern, and escaped hash are not comments',
      ext: '.sh',
      input: `x=$(ls | grep -v "#")  # real comment
case $x in
  a) echo "#1" ;;  # real comment
esac
echo \\# literal  # real comment
f() {
  echo "\${1:-#}"  # real comment
}`,
      expected: `x=$(ls | grep -v "#")
case $x in
  a) echo "#1" ;;
esac
echo \\# literal
f() {
  echo "\${1:-#}"
}`,
    },
    {
      name: 'Shell herestring and ANSI-C quoting are not treated as heredoc or comment',
      ext: '.sh',
      input: `cat <<< "#not heredoc"  # real comment
printf $'a#b\\n'  # real comment
echo done  # real comment`,
      expected: `cat <<< "#not heredoc"
printf $'a#b\\n'
echo done`,
    },
    {
      name: 'Shell heredoc with <<- strips leading tabs when matching the delimiter',
      ext: '.sh',
      input: `cat <<-EOF
\t# body
\tEOF
echo done  # real comment`,
      expected: `cat <<-EOF
\t# body
\tEOF
echo done`,
    },
    {
      name: 'Shell double-quoted string spanning lines keeps hash inside',
      ext: '.sh',
      input: `x="a
b # not a comment"  # real comment
echo $x  # real comment`,
      expected: `x="a
b # not a comment"
echo $x`,
    },
    {
      name: 'YAML doubled single quote escape does not break quote tracking',
      ext: '.yaml',
      input: `a: 'It''s ok'  # real comment
b: 1  # real comment`,
      expected: `a: 'It''s ok'
b: 1`,
    },
    {
      name: 'YAML flow collections and quoted keys keep hash inside',
      ext: '.yaml',
      input: `a: [1, 2]  # real comment
b: {x: "#y"}  # real comment
"k#1": v  # real comment
c: &base !!str v  # real comment`,
      expected: `a: [1, 2]
b: {x: "#y"}
"k#1": v
c: &base !!str v`,
    },
    {
      name: 'YAML folded scalar and nested list block scalar end at dedent',
      ext: '.yaml',
      input: `a: >
  line # kept
b: 2  # real comment
x:
  - |
    # kept
  - y  # real comment`,
      expected: `a: >
  line # kept
b: 2
x:
  - |
    # kept
  - y`,
    },
    {
      name: 'YAML document markers and multi-line double-quoted scalar',
      ext: '.yaml',
      input: `---  # real comment
a: "x
  y"  # real comment
...  # real comment`,
      expected: `---
a: "x
  y"
...`,
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

  describe('SCSS, Sass and Less keep unquoted url() values', () => {
    // These profiles have real `//` line comments, so an unquoted `url(http://...)` used to
    // be cut at its `//` together with the rest of the line.
    test.each(['.scss', '.sass', '.less'])('keeps absolute and protocol-relative URLs in %s', (ext) => {
      const manipulator = getFileManipulator(`test${ext}`);
      const input = [
        '.a { background: url(http://example.com/a.png); } // trailing',
        '.b { background: url( https://example.com/b.png ) no-repeat; }',
        '.c { background: URL(//cdn.example.com/c.png), url(//cdn.example.com/d.png); }',
        '// whole-line comment with url(http://example.com/gone.png)',
        '/* block comment url(http://example.com/gone.png) */',
        '.d { background: url(\'http://example.com/e.png\'); content: "// not a comment"; }',
      ].join('\n');
      expect(manipulator?.removeComments(input)).toBe(
        [
          '.a { background: url(http://example.com/a.png); }',
          '.b { background: url( https://example.com/b.png ) no-repeat; }',
          '.c { background: URL(//cdn.example.com/c.png), url(//cdn.example.com/d.png); }',
          '',
          '',
          '.d { background: url(\'http://example.com/e.png\'); content: "// not a comment"; }',
        ].join('\n'),
      );
    });

    test('does not confuse file content that looks like a placeholder', () => {
      const manipulator = getFileManipulator('test.scss');
      const input = '$x: __REPOMIX_URL_0__; // comment\n.a { background: url(http://example.com/a.png); }';
      expect(manipulator?.removeComments(input)).toBe(
        '$x: __REPOMIX_URL_0__;\n.a { background: url(http://example.com/a.png); }',
      );
    });
    test('keeps code after a block comment that mentions `url(`', () => {
      const manipulator = getFileManipulator('test.scss');
      const input = '/* The url( prefix */ .a { color: rgb(1, 2, 3); }';
      expect(manipulator?.removeComments(input)).toBe(' .a { color: rgb(1, 2, 3); }');
    });

    test('keeps an unquoted URL that contains `*/`', () => {
      const manipulator = getFileManipulator('test.scss');
      const input = '.a { background: url(https://example.com/a*/b.png); color: red; }';
      expect(manipulator?.removeComments(input)).toBe(input);
    });
    test('stays fast on many unclosed block comment openers', () => {
      const manipulator = getFileManipulator('test.scss');
      const input = `// ${'/* '.repeat(256_000)}\n.a { color: red; }`;
      const start = performance.now();
      expect(manipulator?.removeComments(input)).toBe('\n.a { color: red; }');
      expect(performance.now() - start).toBeLessThan(2000);
    });
  });

  describe('Vue and Svelte strip each section with its own language', () => {
    test('keeps `//` in Vue markup and style, and keeps script tag attributes', () => {
      const manipulator = getFileManipulator('App.vue');
      const input = `<template>
  <!-- HTML comment -->
  <p>Visit http://example.com today</p>
  <img src=http://example.com/a.png>
</template>
<script setup lang="ts" generic="T extends Record<string, unknown>">
// JavaScript comment
const url = 'http://example.com'; /* block */
</script>
<style scoped>
/* CSS comment */
.a { background: url(http://example.com/a.png); }
</style>`;
      expect(manipulator?.removeComments(input)).toBe(`<template>

  <p>Visit http://example.com today</p>
  <img src=http://example.com/a.png>
</template>
<script setup lang="ts" generic="T extends Record<string, unknown>">

const url = 'http://example.com';
</script>
<style scoped>

.a { background: url(http://example.com/a.png); }
</style>`);
    });

    test('strips `//` comments in a Vue style block with lang="scss" but keeps its URLs', () => {
      const manipulator = getFileManipulator('App.vue');
      const input = `<style lang="scss">
// SCSS comment
.a { background: url(//cdn.example.com/a.png); }
</style>
<style lang="less">
.b { background: url(https://example.com/b.png); } // Less comment
</style>
<style>
.c { color: red; } // not a CSS comment, kept as-is
</style>`;
      expect(manipulator?.removeComments(input)).toBe(`<style lang="scss">

.a { background: url(//cdn.example.com/a.png); }
</style>
<style lang="less">
.b { background: url(https://example.com/b.png); }
</style>
<style>
.c { color: red; } // not a CSS comment, kept as-is
</style>`);
    });

    test('keeps `//` in Svelte markup', () => {
      const manipulator = getFileManipulator('App.svelte');
      const input = `<script lang="ts">
  // JavaScript comment
  let href = 'https://example.com';
</script>

<!-- HTML comment -->
<a {href}>Docs at https://example.com/docs</a>
<svelte:head>
  <link rel="stylesheet" href=//cdn.example.com/a.css>
</svelte:head>

<style>
  a { background: url(http://example.com/a.png); }
</style>`;
      expect(manipulator?.removeComments(input)).toBe(`<script lang="ts">

  let href = 'https://example.com';
</script>


<a {href}>Docs at https://example.com/docs</a>
<svelte:head>
  <link rel="stylesheet" href=//cdn.example.com/a.css>
</svelte:head>

<style>
  a { background: url(http://example.com/a.png); }
</style>`);
    });

    test('treats a commented-out script as markup', () => {
      const manipulator = getFileManipulator('App.vue');
      const input = '<!-- <script>const a = 1;</script> -->\n<p>http://example.com</p>';
      expect(manipulator?.removeComments(input)).toBe('\n<p>http://example.com</p>');
    });
    test('does not treat a hyphenated component such as <style-preview> as a style block', () => {
      const manipulator = getFileManipulator('App.vue');
      const input =
        '<template><style-preview>Preview</style-preview></template>\n<style lang="scss">// comment\n.a{color:red}</style>';
      expect(manipulator?.removeComments(input)).toBe(
        '<template><style-preview>Preview</style-preview></template>\n<style lang="scss">\n.a{color:red}</style>',
      );
    });
  });

  describe('JavaScript and TypeScript keep `//` and `/*` that are not comments', () => {
    const strip = (ext: string, input: string) => getFileManipulator(`file${ext}`)?.removeComments(input);

    test('keeps a URL in a string that follows an empty string', () => {
      expect(strip('.ts', "const a = '';\nconst b = 'https://example.com'; // docs\n")).toBe(
        "const a = '';\nconst b = 'https://example.com';\n",
      );
    });

    test('a quote inside a regex literal does not start a string', () => {
      expect(strip('.ts', "const quote = /'/;\nconst url = 'https://example.com'; // trailing\n")).toBe(
        "const quote = /'/;\nconst url = 'https://example.com';\n",
      );
    });

    test('`/*` inside a regex character class does not start a comment', () => {
      expect(strip('.js', 'const re = /[/*]/;\nconst x = 1; /* note */\nconst y = 2;\n')).toBe(
        'const re = /[/*]/;\nconst x = 1;\nconst y = 2;\n',
      );
    });

    test('keeps `//` and `/*` escaped inside a regex literal', () => {
      expect(strip('.ts', 'const r = /a\\/\\/b\\/\\*/g; // c\n')).toBe('const r = /a\\/\\/b\\/\\*/g;\n');
    });

    test('keeps a tagged template literal and strips comments in its placeholders', () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal TypeScript source under test
      const input = 'const Box = styled.div`background: url(//cdn.example.com/a.png); ${({ a }) => a /* x */}`; // c\n';
      expect(strip('.ts', input)).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal TypeScript source under test
        'const Box = styled.div`background: url(//cdn.example.com/a.png); ${({ a }) => a }`;\n',
      );
    });

    test('keeps `//` and `/*` in JSX text and attributes, and strips comments in JSX expressions', () => {
      const input = [
        'const A = () => (',
        '  <div title="a//b" onClick={() => go() /* c */}>',
        '    {/* jsx comment */}',
        '    Docs at https://example.com <b>/* literal */</b>',
        '    <img src="//cdn.example.com/a.png" />',
        '  </div>',
        '); // end',
        '',
      ].join('\n');
      const expected = [
        'const A = () => (',
        '  <div title="a//b" onClick={() => go() }>',
        '    {}',
        '    Docs at https://example.com <b>/* literal */</b>',
        '    <img src="//cdn.example.com/a.png" />',
        '  </div>',
        ');',
        '',
      ].join('\n');
      expect(strip('.tsx', input)).toBe(expected);
      expect(strip('.jsx', input)).toBe(expected);
    });

    test('does not treat comparisons, generics or type assertions as JSX', () => {
      expect(strip('.tsx', 'const f = <T,>(x: T) => x; // generic\nconst g = a < b && c > d; // cmp\n')).toBe(
        'const f = <T,>(x: T) => x;\nconst g = a < b && c > d;\n',
      );
      expect(strip('.ts', "const v = <Foo>bar; // assertion\nconst s = '<p>//</p>';\n")).toBe(
        "const v = <Foo>bar;\nconst s = '<p>//</p>';\n",
      );
    });

    test('treats `/` after a value as division', () => {
      expect(strip('.js', 'const n = a / b; // c\nconst m = (x) / 2 / 3; // d\n')).toBe(
        'const n = a / b;\nconst m = (x) / 2 / 3;\n',
      );
    });

    test('treats `/` after postfix `++`, `--` and a non-null `!` as division', () => {
      expect(strip('.js', 'const n = i++ / 2; /* a */\nconst m = j-- / 2; // b\n')).toBe(
        'const n = i++ / 2;\nconst m = j-- / 2;\n',
      );
      expect(strip('.ts', 'const n = v! / 2; // c\nconst ok = !/re/.test(s); // d\n')).toBe(
        'const n = v! / 2;\nconst ok = !/re/.test(s);\n',
      );
    });

    test('ends a line comment at CR, LS and PS line terminators', () => {
      for (const terminator of ['\r', '\u2028', '\u2029']) {
        const output = strip('.ts', `const a = 1; // a${terminator}const b = 2;`);
        expect(output).not.toContain('// a');
        expect(output).toContain(`${terminator}const b = 2;`);
      }
    });

    test('starts a regex after a control-flow `)` or a block `}`', () => {
      expect(strip('.js', 'if (ok) /[/*]/.test(s); // a\nwhile (x) {} /[/*]/.test(s); // b\nconst y = 1;\n')).toBe(
        'if (ok) /[/*]/.test(s);\nwhile (x) {} /[/*]/.test(s);\nconst y = 1;\n',
      );
      expect(strip('.js', 'const n = f(x) / 2 / (a + b); // c\n')).toBe('const n = f(x) / 2 / (a + b);\n');
    });

    test('does not treat NBSP as part of a keyword', () => {
      expect(strip('.js', 'function f() { return\u00a0/[/*]/.test(s); } // c\nconst y = 1;\n')).toBe(
        'function f() { return\u00a0/[/*]/.test(s); }\nconst y = 1;\n',
      );
    });

    test('keeps a CRLF line continuation inside a string', () => {
      // Trailing whitespace (including the CR) is trimmed per line afterwards; the string must stay whole.
      expect(strip('.js', "const a = 'a\\\r\nhttps://example.com'; // c\r\n")).toBe(
        "const a = 'a\\\nhttps://example.com';\n",
      );
    });

    test('keeps U+2028 and U+2029 from removed block comments', () => {
      expect(strip('.js', 'function f() { return /*\u2028*/ 1; }')).toContain('\u2028');
      expect(strip('.js', 'function f() { return /*\u2029*/ 1; }')).toContain('\u2029');
    });

    test('keeps `//` in JSX children of a generic element', () => {
      expect(strip('.tsx', 'const v = <List<Item>>https://example.com</List>; // c\n')).toBe(
        'const v = <List<Item>>https://example.com</List>;\n',
      );
    });

    test('enables JSX in Vue `<script lang="tsx">` and keeps it off for `lang="ts"`', () => {
      expect(strip('.vue', '<script lang="tsx">\nconst a = <p>https://example.com</p>; // c\n</script>\n')).toBe(
        '<script lang="tsx">\nconst a = <p>https://example.com</p>;\n</script>\n',
      );
      expect(strip('.vue', '<script lang="ts">\nconst a = <T>x; // c\n</script>\n')).toBe(
        '<script lang="ts">\nconst a = <T>x;\n</script>\n',
      );
    });

    test('treats `++` on a new line as a prefix operator', () => {
      expect(strip('.js', 'tick()\n++/[/*]/.lastIndex; // a\nkeep();\n')).toBe(
        'tick()\n++/[/*]/.lastIndex;\nkeep();\n',
      );
      expect(strip('.js', 'tick() /*\n*/ ++/[/*]/.lastIndex; // a\nkeep();\n')).toBe(
        'tick()\n ++/[/*]/.lastIndex;\nkeep();\n',
      );
    });

    test('treats `!` after a control-flow `)` as unary', () => {
      expect(strip('.js', 'if (ready) !/[/*]/.test(s); keep(); // a\n')).toBe('if (ready) !/[/*]/.test(s); keep();\n');
    });

    test('recognises control keywords by whole token, at any distance from `(`', () => {
      expect(strip('.js', `if${' '.repeat(40)}(ok) /[/*]/.test(s); keep(); // a\n`)).toBe(
        `if${' '.repeat(40)}(ok) /[/*]/.test(s); keep();\n`,
      );
      expect(strip('.js', 'const n = \u03b1if(x) / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = \u03b1if(x) / 2; const r = /[/*]/; keep();\n',
      );
      expect(strip('.js', 'const n = o.if(x) / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = o.if(x) / 2; const r = /[/*]/; keep();\n',
      );
    });

    test('treats `/` after an object literal as division and after a block as a regex', () => {
      expect(strip('.js', 'const n = { valueOf: () => 6 } / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = { valueOf: () => 6 } / 2; const r = /[/*]/; keep();\n',
      );
      expect(strip('.js', 'const f = () => {} \n/[/*]/.test(s); keep(); // a\n')).toBe(
        'const f = () => {}\n/[/*]/.test(s); keep();\n',
      );
    });

    test('consumes type arguments in a JSX opening tag', () => {
      expect(strip('.tsx', 'const v = <List<Item> />; // c\nconst n = 1; // d\n')).toBe(
        'const v = <List<Item> />;\nconst n = 1;\n',
      );
      expect(strip('.tsx', 'const v = <List<Item> label="{https://example.com}" />; // c\n')).toBe(
        'const v = <List<Item> label="{https://example.com}" />;\n',
      );
      expect(strip('.tsx', 'const v = <Grid<Map<K, (a: A) => B>> />; // c\n')).toBe(
        'const v = <Grid<Map<K, (a: A) => B>> />;\n',
      );
    });

    test('starts a regex after a block that follows a label, `case` or `return` and a newline', () => {
      expect(strip('.js', 'label: {} /[/*]/.test(s); keep(); // a\n')).toBe('label: {} /[/*]/.test(s); keep();\n');
      expect(strip('.js', 'switch (kind) { case 1: {} /[/*]/.test(s); keep(); } // a\n')).toBe(
        'switch (kind) { case 1: {} /[/*]/.test(s); keep(); }\n',
      );
      expect(strip('.js', 'switch (k) { default: {} /[/*]/.test(s); keep(); } // a\n')).toBe(
        'switch (k) { default: {} /[/*]/.test(s); keep(); }\n',
      );
      expect(strip('.js', 'function f() { return\n{} /[/*]/.test(s); keep(); } // a\n')).toBe(
        'function f() { return\n{} /[/*]/.test(s); keep(); }\n',
      );
    });

    test('still treats `/` after an object literal in a property or conditional as division', () => {
      expect(strip('.js', 'const o = { a: { valueOf: () => 6 } / 2 }; const r = /[/*]/; keep(); // a\n')).toBe(
        'const o = { a: { valueOf: () => 6 } / 2 }; const r = /[/*]/; keep();\n',
      );
      expect(strip('.js', 'const n = c ? 1 : { valueOf: () => 6 } / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = c ? 1 : { valueOf: () => 6 } / 2; const r = /[/*]/; keep();\n',
      );
      expect(strip('.ts', 'const n = a?.b ?? c ? 1 : { valueOf: () => 6 } / 2; const r = /[/*]/; // a\n')).toBe(
        'const n = a?.b ?? c ? 1 : { valueOf: () => 6 } / 2; const r = /[/*]/;\n',
      );
    });

    test('treats `/` after a spaced non-null `!` as division', () => {
      expect(strip('.ts', 'const n = value ! / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = value ! / 2; const r = /[/*]/; keep();\n',
      );
      expect(strip('.ts', 'const n = value /* x */ ! / 2; const r = /[/*]/; keep(); // a\n')).toBe(
        'const n = value  ! / 2; const r = /[/*]/; keep();\n',
      );
      expect(strip('.js', 'tick()\n!/[/*]/.test(s); keep(); // a\n')).toBe('tick()\n!/[/*]/.test(s); keep();\n');
    });

    test('removes comments inside JSX type arguments', () => {
      expect(strip('.tsx', 'const v = <List</* item type */ Item>>text</List>;\n')).toBe(
        'const v = <List< Item>>text</List>;\n',
      );
      expect(strip('.tsx', "const v = <List<Item // it's <a> type\n>>text</List>;\n")).toBe(
        'const v = <List<Item\n>>text</List>;\n',
      );
    });

    test('reads the Vue `lang` attribute by its full name', () => {
      expect(
        strip('.vue', '<script data-lang="ts" lang="tsx">\nconst a = <p>https://example.com</p>; // c\n</script>\n'),
      ).toBe('<script data-lang="ts" lang="tsx">\nconst a = <p>https://example.com</p>;\n</script>\n');
      expect(strip('.vue', '<script title="lang=tsx" lang="ts">\nconst a = <T>x; // c\n</script>\n')).toBe(
        '<script title="lang=tsx" lang="ts">\nconst a = <T>x;\n</script>\n',
      );
    });

    test('keeps line numbers when removing multi-line block comments', () => {
      const input = "const a = '';\n/*\n * doc\n */\nconst b = 1;\n";
      expect(strip('.ts', input)?.split('\n')).toHaveLength(input.split('\n').length);
    });
  });

  describe('JS/TS module extension variants', () => {
    // .mjs/.cjs/.mjsx/.mts/.cts/.mtsx are ESM/CommonJS variants of .js/.ts and are
    // treated as JavaScript/TypeScript everywhere else (tree-sitter languageConfig,
    // skill stats), so comment stripping must resolve a manipulator for them too.
    test.each(['.mjs', '.cjs', '.mjsx', '.mts', '.cts', '.mtsx'])('resolves a manipulator for %s', (ext) => {
      expect(getFileManipulator(`test${ext}`)).not.toBeNull();
    });

    test('strips comments from a .mjs file', () => {
      const manipulator = getFileManipulator('eslint.config.mjs');
      const input = 'const a = 1; // inline\n/* block */\nexport default a;';
      expect(manipulator?.removeComments(input)).toBe('const a = 1;\n\nexport default a;');
    });
  });

  describe('case-insensitive extension matching', () => {
    // Extensions are matched case-insensitively, so files with uppercase or
    // mixed-case extensions still resolve to a manipulator. Without this,
    // removeComments and removeEmptyLines silently no-op on such files.
    test.each(['.JS', '.Js', '.PY', '.CSS', '.C', '.HTML', '.Vue'])(
      'resolves a manipulator for uppercase extension %s',
      (ext) => {
        expect(getFileManipulator(`test${ext}`)).not.toBeNull();
      },
    );

    test('strips comments from a file with an uppercase extension', () => {
      const manipulator = getFileManipulator('Main.JS');
      const input = 'const a = 1; // inline\n/* block */\nconst b = 2;';
      expect(manipulator?.removeComments(input)).toBe('const a = 1;\n\nconst b = 2;');
    });

    test('still returns null for unsupported uppercase extensions', () => {
      expect(getFileManipulator('test.UNSUPPORTED')).toBeNull();
    });
  });

  describe('removeEmptyLines', () => {
    // BaseManipulator.removeEmptyLines is inherited by every concrete manipulator.
    // It runs after comment stripping in fileProcess to clean up the blanks left behind.
    test('drops empty lines and whitespace-only lines', () => {
      const manipulator = getFileManipulator('test.js');
      const input = 'const a = 1;\n\n   \nconst b = 2;\n\nconst c = 3;\n';
      expect(manipulator?.removeEmptyLines(input)).toBe('const a = 1;\nconst b = 2;\nconst c = 3;');
    });

    test('returns content unchanged when no empty lines exist', () => {
      const manipulator = getFileManipulator('test.js');
      const input = 'line1\nline2\nline3';
      expect(manipulator?.removeEmptyLines(input)).toBe(input);
    });

    test('returns empty string when input is all blank lines', () => {
      const manipulator = getFileManipulator('test.js');
      expect(manipulator?.removeEmptyLines('\n\n   \n')).toBe('');
    });

    test('works for single-file component manipulators (.vue)', () => {
      const manipulator = getFileManipulator('test.vue');
      const input = 'a\n\nb';
      expect(manipulator?.removeEmptyLines(input)).toBe('a\nb');
    });
  });
});
