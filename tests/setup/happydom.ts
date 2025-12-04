import { GlobalRegistrator } from '@happy-dom/global-registrator';

/**
 * Registers Happy DOM globals for unit tests that need DOM simulation.
 *
 * NOTE: This setup file is only used for unit tests (environment: happy-dom).
 * Integration tests use Node environment to avoid fetch override issues with PostgREST.
 */
if (process.env.DISABLE_HAPPY_DOM !== 'true') {
  GlobalRegistrator.register();
}
