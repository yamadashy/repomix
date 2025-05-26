/**
 * Service for analyzing repository content
 */
import { RepositoryEntity } from '../repository/RepositoryEntity.js';
import { AnalysisResult } from './AnalysisResult.js';
import { AnalysisOptions } from './AnalysisOptions.js';

export interface AnalysisService {
  /**
   * Analyze a repository and calculate metrics
   */
  analyzeRepository(repository: RepositoryEntity, options: AnalysisOptions): Promise<AnalysisResult>;
}
