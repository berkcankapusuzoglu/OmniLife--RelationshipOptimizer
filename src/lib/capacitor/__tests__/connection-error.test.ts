import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import config from "../../../../capacitor.config";

describe("native connection error page", () => {
  it("bundles the configured error page with a Retry link to the exact HTTPS server", () => {
    expect(config.server?.errorPath).toBeTruthy();
    expect(new URL(config.server!.url!).protocol).toBe("https:");

    const html = readFileSync(
      path.resolve(config.webDir!, config.server!.errorPath!),
      "utf8",
    );
    const retryTarget = html.match(/<a id="retry" href="([^"]+)">Retry<\/a>/)?.[1];

    expect(retryTarget).toBe(config.server!.url);
    expect(html).not.toMatch(/<script\b|<iframe\b|http-equiv="refresh"/i);
    expect(config.server?.allowNavigation).toBeUndefined();
  });
});
