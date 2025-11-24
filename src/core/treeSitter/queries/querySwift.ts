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
    (subscript_declaration) @name.definition.method
    (init_declaration "init" @name) @definition.method
    (deinit_declaration "deinit" @name) @definition.method
  ]
)

(protocol_body
  [
    (protocol_function_declaration
      name: (simple_identifier) @name
    ) @definition.method
    (subscript_declaration) @name.definition.method
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
