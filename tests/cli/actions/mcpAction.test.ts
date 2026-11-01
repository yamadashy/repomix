import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runMcpAction } from '../../../src/cli/actions/mcpAction.js';
import { logger } from '../../../src/shared/logger.js';

describe('mcpAction', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should start MCP server and log trace message', async () => {
    const mockRunMcpServer = vi.fn().mockResolvedValue(undefined);

    await runMcpAction({}, { runMcpServer: mockRunMcpServer });

    expect(logger.trace).toHaveBeenCalledWith('Starting Repomix MCP server...');
    expect(mockRunMcpServer).toHaveBeenCalled();
  });

  test('should handle MCP server startup error', async () => {
    const mockRunMcpServer = vi.fn().mockRejectedValue(new Error('Server startup failed'));

    await expect(runMcpAction({}, { runMcpServer: mockRunMcpServer })).rejects.toThrow('Server startup failed');

    expect(logger.trace).toHaveBeenCalledWith('Starting Repomix MCP server...');
    expect(mockRunMcpServer).toHaveBeenCalled();
  });
});
