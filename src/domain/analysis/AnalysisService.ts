/**
 * Service for analyzing repository content
 */
import type { RepositoryEntity } from '../repository/RepositoryEntity.js';
import type { AnalysisOptions } from './AnalysisOptions.js';
import type { AnalysisResult } from './AnalysisResult.js';

export interface AnalysisService {
  /**
   * Analyze a repository and calculate metrics
   */
  analyzeRepository(repository: RepositoryEntity, options: AnalysisOptions): Promise<AnalysisResult>;
}
