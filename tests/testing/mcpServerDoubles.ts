import type { CallToolResult, GetPromptResult, McpServer } from '@modelcontextprotocol/server';
import { vi } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: registered handlers are stored untyped; callers name the shape they expect
type AnyHandler = (...args: any[]) => any;
type RegisterArgs = [name: string, config: Record<string, unknown>, handler: AnyHandler];

export type ToolHandler<Args = Record<string, unknown>> = (args: Args, ctx?: unknown) => Promise<CallToolResult>;
export type PromptHandler<Args = Record<string, unknown>> = (args: Args) => Promise<GetPromptResult>;

const handlerFor = (calls: RegisterArgs[], kind: string, name?: string): AnyHandler => {
  const call = name === undefined ? calls[0] : calls.find(([registeredName]) => registeredName === name);
  if (!call) {
    throw new Error(`No ${kind} registered${name === undefined ? '' : ` as ${name}`}`);
  }
  return call[2];
};

/**
 * An `McpServer` stand-in that records `registerTool` / `registerPrompt` calls so tests can pull out
 * the registered handler and invoke it directly. The SDK overloads both methods generically, so the
 * recorded handlers are untyped and `toolHandler` / `promptHandler` take the shape the test expects.
 */
export const createMcpServerDouble = () => {
  const registerTool = vi.fn<(...args: RegisterArgs) => void>();
  const registerPrompt = vi.fn<(...args: RegisterArgs) => void>();
  const connect = vi.fn<() => Promise<void>>(async () => {});
  const close = vi.fn<() => Promise<void>>(async () => {});
  // Only the members the code under test touches exist, so the one cast to the SDK class lives here.
  const server = { registerTool, registerPrompt, connect, close } as unknown as McpServer;

  return {
    server,
    registerTool,
    registerPrompt,
    connect,
    close,
    /** The handler of the tool registered as `name`, or of the first registered tool. */
    toolHandler: <H extends AnyHandler = ToolHandler>(name?: string): H =>
      handlerFor(registerTool.mock.calls, 'tool', name) as H,
    /** The handler of the prompt registered as `name`, or of the first registered prompt. */
    promptHandler: <H extends AnyHandler = PromptHandler>(name?: string): H =>
      handlerFor(registerPrompt.mock.calls, 'prompt', name) as H,
  };
};

export type McpServerDouble = ReturnType<typeof createMcpServerDouble>;
