import type { Mock } from "bun:test";

export const mockFn = <Fn extends (...args: any[]) => any>(fn: Fn): Mock<Fn> =>
  fn as unknown as Mock<Fn>;
