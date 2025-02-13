export const FILE_SIZE_LIMITS = {
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ZIP_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UNCOMPRESSED_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 1000, // Maximum number of files in zip
} as const;

// Helper function to format size for error messages
export const formatFileSize = (bytes: number): string => {
  return `${bytes / 1024 / 1024}MB`;
};
