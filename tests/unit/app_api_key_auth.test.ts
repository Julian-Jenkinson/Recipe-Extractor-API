import {
  evaluateAppApiKey,
  normalizeAppApiKeyMode,
  resolveAppApiKeyConfig,
} from "../../src/application/appApiKeyAuth";

describe("unit/app api key auth", () => {
  test("defaults to off when no key is configured", () => {
    expect(normalizeAppApiKeyMode("", false)).toBe("off");
    expect(resolveAppApiKeyConfig({})).toEqual({
      key: "",
      mode: "off",
    });
  });

  test("defaults to on when a key is configured without an explicit mode", () => {
    expect(normalizeAppApiKeyMode("", true)).toBe("on");
    expect(resolveAppApiKeyConfig({ appApiKey: " secret-key " })).toEqual({
      key: "secret-key",
      mode: "on",
    });
  });

  test("allows valid explicit modes", () => {
    expect(normalizeAppApiKeyMode("off", true)).toBe("off");
    expect(normalizeAppApiKeyMode("warn", true)).toBe("warn");
    expect(normalizeAppApiKeyMode("on", true)).toBe("on");
  });

  test("falls back safely for invalid modes", () => {
    expect(normalizeAppApiKeyMode("maybe", true)).toBe("on");
    expect(normalizeAppApiKeyMode("maybe", false)).toBe("off");
  });

  test("off mode allows requests without warnings", () => {
    const config = resolveAppApiKeyConfig({
      appApiKey: "secret-key",
      appApiKeyMode: "off",
    });

    expect(evaluateAppApiKey(config, undefined)).toEqual({
      allow: true,
      shouldWarn: false,
    });
  });

  test("warn mode allows missing or invalid keys and flags them for logging", () => {
    const config = resolveAppApiKeyConfig({
      appApiKey: "secret-key",
      appApiKeyMode: "warn",
    });

    expect(evaluateAppApiKey(config, undefined)).toEqual({
      allow: true,
      shouldWarn: true,
    });
    expect(evaluateAppApiKey(config, "wrong-key")).toEqual({
      allow: true,
      shouldWarn: true,
    });
    expect(evaluateAppApiKey(config, "secret-key")).toEqual({
      allow: true,
      shouldWarn: false,
    });
  });

  test("on mode requires a valid key", () => {
    const config = resolveAppApiKeyConfig({
      appApiKey: "secret-key",
      appApiKeyMode: "on",
    });

    expect(evaluateAppApiKey(config, undefined)).toEqual({
      allow: false,
      shouldWarn: false,
    });
    expect(evaluateAppApiKey(config, "wrong-key")).toEqual({
      allow: false,
      shouldWarn: false,
    });
    expect(evaluateAppApiKey(config, " secret-key ")).toEqual({
      allow: true,
      shouldWarn: false,
    });
  });
});
