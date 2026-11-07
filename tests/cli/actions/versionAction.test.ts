import { describe, expect, it, vi } from 'vitest';
import { runVersionAction } from '../../../src/cli/actions/versionAction.js';
import { logger } from '../../../src/shared/logger.js';

describe('versionAction', () => {
  it('should print the correct version', async () => {
    const getVersion = vi.fn().mockResolvedValue('1.2.3');

    const loggerSpy = vi.spyOn(logger, 'log').mockImplementation(vi.fn());
    await runVersionAction({ getVersion });

    expect(getVersion).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith('1.2.3');
  });
});
