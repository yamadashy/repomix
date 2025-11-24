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
    ; Note: Subscript currently captures parameter name (e.g., "key") rather than
    ; the subscript itself. This may cause non-unique identifiers when multiple
    ; subscripts use the same parameter name. Consider capturing the type signature
    ; or the entire subscript declaration in future improvements.
    (subscript_declaration
      (parameter (simple_identifier) @name)
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
    ; Note: Same subscript parameter naming consideration as in class_body above
    (subscript_declaration
      (parameter (simple_identifier) @name)
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

(property_declaration
    (pattern (simple_identifier) @name)
) @definition.property

(function_declaration
    name: (simple_identifier) @name) @definition.function
`;
