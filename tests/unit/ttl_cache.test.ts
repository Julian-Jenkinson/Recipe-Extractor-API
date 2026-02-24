import { TtlCache } from "../../src/application/ttlCache";

describe("unit/ttl cache", () => {
  test("returns null for missing and expired entries", () => {
    const cache = new TtlCache<string>(10, 2);
    expect(cache.get("missing")).toBeNull();

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    cache.set("a", "1");
    nowSpy.mockReturnValue(2000);
    expect(cache.get("a")).toBeNull();
    nowSpy.mockRestore();
  });

  test("respects ttl/max guards and clear", () => {
    const disabledByTtl = new TtlCache<string>(0, 10);
    disabledByTtl.set("a", "1");
    expect(disabledByTtl.get("a")).toBeNull();

    const disabledBySize = new TtlCache<string>(1000, 0);
    disabledBySize.set("a", "1");
    expect(disabledBySize.get("a")).toBeNull();

    const cache = new TtlCache<string>(1000, 2);
    cache.set("a", "1");
    cache.clear();
    expect(cache.get("a")).toBeNull();
  });

  test("prunes expired entries and evicts oldest when full", () => {
    const cache = new TtlCache<string>(1000, 2);
    const nowSpy = jest.spyOn(Date, "now");

    nowSpy.mockReturnValue(1000);
    cache.set("old", "1");

    nowSpy.mockReturnValue(1100);
    cache.set("new", "2");

    nowSpy.mockReturnValue(2500);
    cache.prune();
    expect(cache.get("old")).toBeNull();

    nowSpy.mockReturnValue(3000);
    cache.set("x", "x");
    nowSpy.mockReturnValue(3001);
    cache.set("y", "y");
    nowSpy.mockReturnValue(3002);
    cache.set("z", "z");

    expect(cache.get("x")).toBeNull();
    expect(cache.get("y")).toBe("y");
    expect(cache.get("z")).toBe("z");

    nowSpy.mockRestore();
  });
});
