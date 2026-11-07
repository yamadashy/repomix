export const queryRust = `
(line_comment) @comment
(block_comment) @comment

; Import statements
(use_declaration
  (scoped_identifier) @name.reference.module) @definition.import

(use_declaration
  (identifier) @name.reference.module) @definition.import

(extern_crate_declaration
  (identifier) @name.reference.module) @definition.import

; ADT definitions

(struct_item
    name: (type_identifier) @name.definition.class) @definition.class

(enum_item
    name: (type_identifier) @name.definition.class) @definition.class

(union_item
    name: (type_identifier) @name.definition.class) @definition.class

; struct and union fields (named fields only, including pub fields)
; The whole declaration is the name capture so multi-line field types are kept
(field_declaration_list
    (field_declaration) @name.definition.field)

; type aliases

(type_item
    name: (type_identifier) @name.definition.class) @definition.class

; method definitions

(declaration_list
    (function_item
        name: (identifier) @name.definition.method)) @definition.method

; function signatures without a body (e.g. trait methods)

(function_signature_item) @name.definition.method

; function definitions

(function_item
    name: (identifier) @name.definition.function) @definition.function

; trait definitions
(trait_item
    name: (type_identifier) @name.definition.interface) @definition.interface

; module definitions
(mod_item
    name: (identifier) @name.definition.module) @definition.module

; macro definitions

(macro_definition
    name: (identifier) @name.definition.macro) @definition.macro

; implementations

(impl_item
    trait: (type_identifier) @name.reference.implementation) @reference.implementation

(impl_item
    type: (type_identifier) @name.reference.implementation
    !trait) @reference.implementation
`;
