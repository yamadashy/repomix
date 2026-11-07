export const queryCss = `
(comment) @comment

(rule_set
  (selectors) @name.definition.selector
) @definition.selector

[
  (at_rule)
  (charset_statement)
  (import_statement)
  (keyframes_statement)
  (media_statement)
  (namespace_statement)
  (supports_statement)
] @definition.at_rule
`;
