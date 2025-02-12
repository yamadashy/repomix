import path from 'node:path';
import Parser from 'web-tree-sitter';
const treeSitterWasmsDir = path.join('node_modules', 'tree-sitter-wasms', 'out');
// Depends on tree-sitter-wasms
export async function loadLanguage(langName: string) {
  //PLEASE FIX THIS: I don't know if it even works on other computers
  return await Parser.Language.load(path.join(treeSitterWasmsDir, `tree-sitter-${langName}.wasm`));
}
