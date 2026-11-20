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
  name: (identifier) @name.definition.extension) @definition.extension

; Typedef / type alias
; type_alias has no named field; the type_identifier (not identifier) is the alias name
(type_alias
  (type_identifier) @name.definition.type) @definition.type

; Field declaration (e.g. 'final String name;', 'static const int x = 1;')
; Only class members: local variables use local_variable_declaration instead.
(class_body
  (declaration
    (initialized_identifier_list
      (initialized_identifier
        (identifier) @name.definition.field))) @definition.field)

(class_body
  (declaration
    (static_final_declaration_list
      (static_final_declaration
        (identifier) @name.definition.field))) @definition.field)

; Function declaration
(function_signature
  name: (identifier) @name.definition.function) @definition.function

; Getter / setter
(getter_signature
  name: (identifier) @name.definition.method) @definition.method

(setter_signature
  name: (identifier) @name.definition.method) @definition.method

; Constructor declaration
; constructor_signature can be wrapped in method_signature (when followed by a body)
; or sit directly under 'declaration' (e.g., bare 'Foo(this.x);').
; Capturing the whole signature node emits its source line(s) regardless of inner
; shape, which also keeps the queries robust across grammar tweaks.
(method_signature
 (constructor_signature) @name.definition.method) @definition.method

(declaration
 (constructor_signature) @name.definition.method) @definition.method

; Constant constructor (e.g. 'const Animal(this.name);', 'const Animal.zero() : ...;')
; constant_constructor_signature is a direct child of 'declaration'.
(declaration
 (constant_constructor_signature) @name.definition.method) @definition.method

; Operator overload (e.g. 'int operator +(int o)', 'int operator [](int i)')
; operator_signature has no identifier name field — the operator token is a
; (binary_operator) / ([]) / ([]=) child. Capture the whole operator_signature
; as the name so DefaultParseStrategy emits its full source range.
(method_signature
 (operator_signature) @name.definition.method) @definition.method

; Factory constructor
; Wrapped in method_signature when it has a body, but bare under 'declaration' for
; 'external factory ...;' and 'const factory ...;' — so query both shapes.
(method_signature
 (factory_constructor_signature) @name.definition.method) @definition.method

(declaration
 (factory_constructor_signature) @name.definition.method) @definition.method

; Redirecting factory constructor (e.g. 'factory Foo.copy(other) = Bar;', 'const factory Foo() = Bar;')
; Always a direct child of 'declaration', never wrapped in method_signature.
(declaration
 (redirecting_factory_constructor_signature) @name.definition.method) @definition.method
`;
