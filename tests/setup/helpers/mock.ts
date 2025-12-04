import type { Mock } from 'vitest';

/**
 * Type-safe cast for mocked functions.
 * Use this to get proper TypeScript types when working with vi.fn() mocks.
 *
 * @example
 * vi.mock("./myModule");
 * mockFn(myModule.myFunction).mockResolvedValue(result);
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic mock function utility needs flexible typing
export const mockFn = <Fn extends (...args: Array<any>) => any>(fn: Fn): Mock<Fn> =>
  fn as unknown as Mock<Fn>;
