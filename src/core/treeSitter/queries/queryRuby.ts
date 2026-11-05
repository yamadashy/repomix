// Receiver-less calls directly in a class or module body are declarations
// (e.g. Rails "has_many :books, dependent: :destroy"). The method name and the
// argument list are emitted, a trailing do...end block is not. Method bodies are
// also body_statement nodes, so the enclosing scope is matched explicitly. Calls
// one level down in a structural block (e.g. "scope" inside "included do") are
// declarations too; other blocks such as "before_save do" are executable code.
const declarationCalls = [
  '(call !receiver method: (identifier) @name.definition.declaration)',
  '(call !receiver arguments: (argument_list) @name.definition.declaration)',
];

// ActiveSupport::Concern, with_options and refinement blocks whose body declares the class
const structuralBlockPattern = '^(included|extended|prepended|class_methods|concerning|refine|with_options)$';

const classBodyDeclarations = ['class', 'module', 'singleton_class']
  .flatMap((scope) => [
    ...declarationCalls.map((call) => `(${scope} body: (body_statement ${call}))`),
    ...declarationCalls.map(
      (call) =>
        `(${scope} body: (body_statement (call !receiver method: (identifier) @_block_scope block: (do_block body: (body_statement ${call}))) (#match? @_block_scope "${structuralBlockPattern}")))`,
    ),
  ])
  .join('\n\n');

export const queryRuby = `
(comment) @comment

; Import, mixin, attribute and visibility statements.
; Only receiver-less calls to these structural methods are kept; any other call
; is part of an implementation body.
(call
  !receiver
  method: (identifier) @name.reference.module
  (#match? @name.reference.module "^(require|require_relative|load|autoload|include|extend|prepend|attr_accessor|attr_reader|attr_writer|private|protected|public|module_function|private_constant)$")) @definition.import

${classBodyDeclarations}

; Bare visibility modifiers (e.g. a lone "private" line inside a class)
(body_statement
  (identifier) @name.definition.visibility
  (#match? @name.definition.visibility "^(private|protected|public|module_function)$"))

; Constant assignments (e.g. "ACTIVE = 1")
(assignment
  left: (constant) @name.definition.constant)

; Method definitions

(
  (comment)* @doc
  .
  [
    (method
      name: (_) @name.definition.method) @definition.method
    (singleton_method
      name: (_) @name.definition.method) @definition.method
  ]
  (#strip! @doc "^#\\s*")
  (#select-adjacent! @doc @definition.method)
)

(alias
  name: (_) @name.definition.method) @definition.method

(setter
  (identifier) @ignore)

; Class definitions

(
  (comment)* @doc
  .
  [
    (class
      name: [
        (constant) @name.definition.class
        (scope_resolution
          name: (_) @name.definition.class)
      ]) @definition.class
    (singleton_class
      value: [
        (constant) @name.definition.class
        (scope_resolution
          name: (_) @name.definition.class)
      ]) @definition.class
  ]
  (#strip! @doc "^#\\s*")
  (#select-adjacent! @doc @definition.class)
)

; Module definitions

(
  (module
    name: [
      (constant) @name.definition.module
      (scope_resolution
        name: (_) @name.definition.module)
    ]) @definition.module
)
`;
