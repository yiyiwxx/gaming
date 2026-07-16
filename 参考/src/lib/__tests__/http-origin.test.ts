import { afterEach, describe, expect, it } from "vitest";

import { buildAppUrl, getAppBasePath, withBasePath } from "@/lib/http/origin";

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

describe("app URL helpers", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  });

  it("keeps local URLs unprefixed when no base path is configured", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "";

    expect(getAppBasePath()).toBe("");
    expect(withBasePath("/api/subscriptions")).toBe("/api/subscriptions");
    expect(buildAppUrl("https://example.com", "/api/calendar/sub_123.ics")).toBe(
      "https://example.com/api/calendar/sub_123.ics",
    );
  });

  it("prefixes app URLs when deployed below a temporary path", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "esports-calendar-test/";

    expect(getAppBasePath()).toBe("/esports-calendar-test");
    expect(withBasePath("/api/subscriptions")).toBe(
      "/esports-calendar-test/api/subscriptions",
    );
    expect(buildAppUrl("https://example.com", "/api/calendar/sub_123.ics")).toBe(
      "https://example.com/esports-calendar-test/api/calendar/sub_123.ics",
    );
  });
});
