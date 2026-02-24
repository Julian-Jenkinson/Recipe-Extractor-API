import { RecipeExtractionError, __testUtils } from "../../src";

describe("unit/url validation and ip guards", () => {
  test("accepts valid https URL", () => {
    const parsed = __testUtils.validateAndNormalizeUrl("https://example.com/recipe");
    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe("example.com");
  });

  test("rejects invalid protocol", () => {
    expect(() => __testUtils.validateAndNormalizeUrl("file:///etc/passwd")).toThrow(RecipeExtractionError);
  });

  test("rejects credentials in URL", () => {
    expect(() => __testUtils.validateAndNormalizeUrl("https://user:pass@example.com")).toThrow(
      "Credentials in URL are not allowed"
    );
  });

  test("rejects local/private hostnames", () => {
    expect(() => __testUtils.validateAndNormalizeUrl("http://localhost")).toThrow(
      "Local/private hosts are not allowed"
    );
    expect(() => __testUtils.validateAndNormalizeUrl("http://api.internal/recipe")).toThrow(
      "Local/private hosts are not allowed"
    );
  });

  test("rejects non-standard web ports", () => {
    expect(() => __testUtils.validateAndNormalizeUrl("https://example.com:444/recipe")).toThrow(
      "Only standard web ports are allowed"
    );
  });

  test("rejects overlong URL", () => {
    const veryLong = `https://example.com/${"a".repeat(3000)}`;
    expect(() => __testUtils.validateAndNormalizeUrl(veryLong)).toThrow("URL is too long");
  });

  test("detects private/reserved IPv4 ranges", () => {
    expect(__testUtils.isPrivateOrReservedIPv4("10.1.2.3")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv4("192.168.1.10")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv4("172.20.0.5")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv4("8.8.8.8")).toBe(false);
  });

  test("detects private/reserved IPv6 ranges", () => {
    expect(__testUtils.isPrivateOrReservedIPv6("::1")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv6("fc00::1")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv6("fd12::1")).toBe(true);
    expect(__testUtils.isPrivateOrReservedIPv6("2001:4860:4860::8888")).toBe(false);
  });
});
