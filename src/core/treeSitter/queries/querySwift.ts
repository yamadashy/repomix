export const querySwift = `
(comment) @comment

(class_declaration
  name: (type_identifier) @name) @definition.class

(protocol_declaration
  name: (type_identifier) @name) @definition.interface

(class_body
  [
    (function_declaration
      name: (simple_identifier) @name
    ) @definition.method
    (init_declaration "init" @name) @definition.method
    (deinit_declaration "deinit" @name) @definition.method
  ]
)

(protocol_body
  [
    (protocol_function_declaration
      name: (simple_identifier) @name
    ) @definition.method
    (init_declaration "init" @name) @definition.method
  ]
)

(class_body
  [
    (property_declaration
      (pattern (simple_identifier) @name)
    ) @definition.property
  ]
)

; Top-level and enum properties. Local variables inside function bodies are
; also property_declaration nodes, so the pattern is anchored to its parent.
(source_file
  (property_declaration
    (pattern (simple_identifier) @name)
  ) @definition.property
)

(enum_class_body
  (property_declaration
    (pattern (simple_identifier) @name)
  ) @definition.property
)

(function_declaration
    name: (simple_identifier) @name) @definition.function

; Subscripts in class, protocol and enum bodies. Signatures can span several
; lines, and the node itself includes the accessor body, so capture the
; "subscript" keyword plus the lines holding its parameters and return type.
(subscript_declaration "subscript" @name) @definition.method

(subscript_declaration
  (parameter) @name.definition.method)

(subscript_declaration
  name: (_) @name.definition.method)
`;
