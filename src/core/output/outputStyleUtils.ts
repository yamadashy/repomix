/**
 * Shared utilities for output style generation.
 */
import Handlebars from 'handlebars';
import { getLanguageFromFilePath } from './fileLanguageMap.js';

export { getLanguageFromFilePath } from './fileLanguageMap.js';

// Track if Handlebars helpers have been registered
let handlebarsHelpersRegistered = false;

/**
 * Register common Handlebars helpers for output generation.
 * This function is idempotent - calling it multiple times has no effect.
 */
export const registerHandlebarsHelpers = (): void => {
  if (handlebarsHelpersRegistered) {
    return;
  }

  Handlebars.registerHelper('getFileExtension', (filePath: string) => {
    return getLanguageFromFilePath(filePath);
  });

  handlebarsHelpersRegistered = true;
};
