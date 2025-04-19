export const queryXml = `
; Elements
(element) @definition.element

; Start tags
(start_tag) @start_tag

; Self-closing tags
(self_closing_tag) @self_closing_tag

; Attribute names and values
(attribute
  (attribute_name) @attribute.name
  (quoted_attribute_value) @attribute.value)

; Comments
(comment) @comment
`; 