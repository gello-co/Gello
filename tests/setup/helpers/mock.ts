import type { Mock } from "bun:test";

export const // biome-ignore lint/suspicious/noExplicitAny: Generic mock function utility needs flexible typing
  mockFn = <Fn extends (...args: any[]) => any>(fn: Fn): Mock<Fn> =>
    fn as unknown as Mock<Fn>;
