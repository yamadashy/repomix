export const queryCSharp = `
(comment) @comment

(class_declaration
  name: (identifier) @name.definition.class
) @definition.class

(interface_declaration
  name: (identifier) @name.definition.interface
) @definition.interface

(method_declaration
  name: (identifier) @name.definition.method
) @definition.method

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
