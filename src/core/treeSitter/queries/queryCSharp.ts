// Compatible with tree-sitter-c-sharp (bundled in @repomix/tree-sitter-wasms@0.1.15)
// Adapted to grammar changes: removed 'bases' field syntax, renamed 'type_constraint' to 'type_parameter_constraint'
export const queryCSharp = `
(comment) @comment

(class_declaration
  name: (identifier) @name.definition.class
) @definition.class

(class_declaration
  (base_list (_) @name.reference.class)
) @reference.class

(interface_declaration
  name: (identifier) @name.definition.interface
) @definition.interface

(interface_declaration
  (base_list (_) @name.reference.interface)
) @reference.interface

(method_declaration
  name: (identifier) @name.definition.method
) @definition.method

(object_creation_expression
  type: (identifier) @name.reference.class
) @reference.class

(variable_declaration
  type: (identifier) @name.reference.class
) @reference.class

; Generic type constraints
; Simple type constraints: where T : IComparable
(type_parameter_constraint
  type: (identifier) @name.reference.class
) @reference.class

; Nested type constraints: where T : IComparable?, where T : IComparable[]
(type_parameter_constraint
  (type
    type: (identifier) @name.reference.class
  )
) @reference.class

(invocation_expression
  function:
    (member_access_expression
      name: (identifier) @name.reference.send
    )
) @reference.send

(namespace_declaration
  name: (identifier) @name.definition.module
) @definition.module
`;
