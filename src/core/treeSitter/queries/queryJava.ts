export const queryJava = `
(line_comment) @comment
(block_comment) @comment

(import_declaration) @definition.import

(package_declaration) @definition.import

(class_declaration
  name: (identifier) @name.definition.class) @definition.class

(method_declaration
  name: (identifier) @name.definition.method) @definition.method

(constructor_declaration
  name: (identifier) @name.definition.method) @definition.method

(field_declaration
  declarator: (variable_declarator
    name: (identifier) @name.definition.field)) @definition.field

(interface_declaration
  name: (identifier) @name.definition.interface) @definition.interface

(type_list
  (type_identifier) @name.reference.implementation) @reference.implementation

(superclass (type_identifier) @name.reference.class) @reference.class
`;
