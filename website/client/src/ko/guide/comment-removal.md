
# Comment Removal

Repomix can automatically remove comments from your codebase when generating the output file. This can help reduce noise and focus on the actual code.

## Usage

To enable comment removal, set the `removeComments` option to `true` in your `repomix.config.json`:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Supported Languages

Repomix supports comment removal for a wide range of programming languages, including:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- And many more...

## Example

Given the following JavaScript code:

```javascript
// This is a single-line comment
function test() {
  /* This is a
     multi-line comment */
  return true;
}
```

With comment removal enabled, the output will be:

```javascript
function test() {
  return true;
}
```

## Notes

- Comment removal is performed before other processing steps, such as line number addition.
- Some comments, such as JSDoc comments, may be preserved depending on the language and context.
