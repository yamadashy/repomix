export const queryGo = `
; For repomix
(comment) @comment
(package_clause) @definition.package
(import_declaration) @definition.import
(var_declaration) @definition.variable
(const_declaration) @definition.constant

; tree-sitter-go
(
  (comment)* @doc
  .
  (function_declaration
    name: (identifier) @name) @definition.function
  (#strip! @doc "^//\\\\s*")
  (#set-adjacent! @doc @definition.function)
)

(
  (comment)* @doc
  .
  (method_declaration
    name: (field_identifier) @name) @definition.method
  (#strip! @doc "^//\\\\s*")
  (#set-adjacent! @doc @definition.method)
)

(call_expression
  function: [
    (identifier) @name
    (parenthesized_expression (identifier) @name)
    (selector_expression field: (field_identifier) @name)
    (parenthesized_expression (selector_expression field: (field_identifier) @name))
  ]) @reference.call

(type_spec
  name: (type_identifier) @name) @definition.type

(type_alias
  name: (type_identifier) @name) @definition.type

(type_identifier) @name @reference.type

(package_clause "package" (package_identifier) @name)

(type_declaration (type_spec name: (type_identifier) @name type: (interface_type)))

(type_declaration (type_spec name: (type_identifier) @name type: (struct_type)))

; Import statements
(import_declaration
  (import_spec_list
    (import_spec
      path: (interpreted_string_literal) @name.reference.module))) @definition.import

(import_declaration
  (import_spec
    path: (interpreted_string_literal) @name.reference.module)) @definition.import

(package_clause
  (package_identifier) @name.reference.module) @definition.package

(var_declaration (var_spec name: (identifier) @name))

(const_declaration (const_spec name: (identifier) @name))
`;
