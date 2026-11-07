export const queryCpp = `
(comment) @comment

(struct_specifier name: (type_identifier) @name.definition.class body:(_)) @definition.class

(union_specifier name: (type_identifier) @name.definition.class body:(_)) @definition.class

(function_declarator declarator: (identifier) @name.definition.function) @definition.function

(function_declarator declarator: (field_identifier) @name.definition.function) @definition.function

(function_declarator declarator: (qualified_identifier scope: (namespace_identifier) @scope name: (identifier) @name.definition.method)) @definition.method

(type_definition declarator: (type_identifier) @name.definition.type) @definition.type

(enum_specifier name: (type_identifier) @name.definition.type) @definition.type

(class_specifier name: (type_identifier) @name.definition.class) @definition.class

(type_definition "typedef" @name.definition.type) @definition.type

(preproc_include) @definition.import

(preproc_def name: (identifier) @name.definition.macro) @definition.macro

(preproc_function_def name: (identifier) @name.definition.macro) @definition.macro
`;
