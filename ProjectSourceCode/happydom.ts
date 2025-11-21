import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * Registers Happy DOM globals before Bun tests execute.
 * The preload is configured via bunfig.toml.
 */
if (process.env.DISABLE_HAPPY_DOM !== "true") {
  GlobalRegistrator.register();
}
