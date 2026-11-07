export const queryC = `
(comment) @comment

(struct_specifier name: (type_identifier) @name.definition.class body:(_)) @definition.class

(union_specifier name: (type_identifier) @name.definition.class body:(_)) @definition.class

(function_declarator declarator: (identifier) @name.definition.function) @definition.function

(type_definition declarator: (type_identifier) @name.definition.type) @definition.type

(enum_specifier name: (type_identifier) @name.definition.type) @definition.type

(type_definition "typedef" @name.definition.type) @definition.type

(preproc_include) @definition.import

(preproc_def name: (identifier) @name.definition.macro) @definition.macro

(preproc_function_def name: (identifier) @name.definition.macro) @definition.macro
`;
