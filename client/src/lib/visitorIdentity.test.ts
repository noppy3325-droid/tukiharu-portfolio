import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("visitor identity without mandatory browser storage", () => {
  it("keeps the existing visitor key", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "existing-visitor",
      setItem: vi.fn(),
    });
    const { getVisitorKey } = await import("./visitorIdentity");
    expect(getVisitorKey()).toBe("existing-visitor");
  });
  it("remains stable in the document if storage is blocked", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { getVisitorKey } = await import("./visitorIdentity");
    const key = getVisitorKey();
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getVisitorKey()).toBe(key);
  });
  it("creates IDs on non-HTTPS LAN previews without randomUUID", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (buffer: Uint8Array) => buffer.fill(7),
    });
    const { createClientId } = await import("./clientId");
    expect(createClientId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
