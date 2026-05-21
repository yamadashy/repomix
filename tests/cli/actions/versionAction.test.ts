import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runVersionAction } from '../../../src/cli/actions/versionAction.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/core/file/packageJsonParse');

describe('versionAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should print the correct version', async () => {
    vi.mocked(packageJsonParser.getVersion).mockResolvedValue('1.2.3');

    using loggerSpy = vi.spyOn(logger, 'log').mockImplementation(vi.fn());
    await runVersionAction();

    expect(packageJsonParser.getVersion).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith('1.2.3');
  });
});
