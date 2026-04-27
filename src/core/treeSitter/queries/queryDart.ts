export const queryDart = `
; Comments
(comment) @comment
(documentation_comment) @comment

; Import and export statements
(import_or_export) @definition.import

; Class declaration
(class_definition
  name: (identifier) @name.definition.class) @definition.class

; Mixin declaration
; mixin_declaration has no named field; the identifier child is the mixin name
; (interface names live inside an 'interfaces' sub-node, so they are not matched here)
(mixin_declaration
  (identifier) @name.definition.mixin) @definition.mixin

; Enum declaration
(enum_declaration
  name: (identifier) @name.definition.enum) @definition.enum

; Extension declaration
(extension_declaration
  name: (identifier) @name.definition.class) @definition.class

; Typedef / type alias
; type_alias has no named field; the type_identifier (not identifier) is the alias name
(type_alias
  (type_identifier) @name.definition.type) @definition.type

; Function declaration
(function_signature
  name: (identifier) @name.definition.function) @definition.function

; Getter / setter
(getter_signature
  name: (identifier) @name.definition.method) @definition.method

(setter_signature
  name: (identifier) @name.definition.method) @definition.method

; Constructor declaration
(method_signature
 (constructor_signature
  name: (identifier) @name.definition.method)) @definition.method

; Factory constructor
; factory_constructor_signature contains dot-separated identifiers (e.g. Foo.from);
; the leading-anchor \`.\` selects the class name only.
(method_signature
 (factory_constructor_signature
  . (identifier) @name.definition.method)) @definition.method

; Redirecting factory constructor (e.g. 'factory Foo.from(...) = Bar.named;')
; redirecting_factory_constructor_signature is a direct child of 'declaration',
; not wrapped by 'method_signature' — so query it bare.
(redirecting_factory_constructor_signature
  . (identifier) @name.definition.method) @definition.method
`;
