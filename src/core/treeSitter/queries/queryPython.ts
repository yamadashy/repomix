export const queryPython = `
(comment) @comment

(expression_statement
  (string) @comment) @docstring

; Import statements
(import_statement
  name: (dotted_name)) @definition.import

(import_from_statement
  module_name: (dotted_name)) @definition.import

(import_from_statement
  name: (dotted_name)) @definition.import

(class_definition
  name: (identifier) @name.definition.class) @definition.class

(function_definition
  name: (identifier) @name.definition.function) @definition.function

(assignment
  left: (identifier) @name.definition.type_alias) @definition.type_alias
`;
