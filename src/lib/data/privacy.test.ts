import { describe, expect, it } from "vitest";
import { privacyNoticeUrl } from "./privacy";

describe("privacyNoticeUrl", () => {
  it("opens the notice in Portuguese for a browser in Portuguese, and in English otherwise", () => {
    expect(privacyNoticeUrl("pt-BR")).toBe("privacidade.html");
    expect(privacyNoticeUrl("pt")).toBe("privacidade.html");
    expect(privacyNoticeUrl("en-US")).toBe("privacy.html");
    expect(privacyNoticeUrl("ja")).toBe("privacy.html");
  });
});
