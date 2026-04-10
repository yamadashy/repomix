export const queryGo = `
; For repomix
(comment) @comment
(package_clause) @definition.package
(import_declaration) @definition.import
(import_spec) @definition.import
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

(type_spec
  name: (type_identifier) @name) @definition.type
`;
