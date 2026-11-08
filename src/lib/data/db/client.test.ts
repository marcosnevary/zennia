import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { accountOf, getAccount, type Db } from "./client";

const user = (extra: Partial<User>): User => ({
  id: "u1",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
  email: "ana@example.com",
  ...extra,
});

const google = (identity_data: Record<string, string>) => ({
  id: "g1",
  user_id: "u1",
  identity_id: "i1",
  provider: "google",
  identity_data,
});

describe("getAccount", () => {
  it("throws when the user can't be fetched, instead of reporting an anonymous one", async () => {
    const db = {
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: new Error("down"),
        }),
      },
    } as unknown as Db;
    await expect(getAccount(db)).rejects.toThrow("down");
  });
});

describe("accountOf", () => {
  it("takes the name and photo from the Google identity", () => {
    const account = accountOf(
      user({
        identities: [
          google({ full_name: "Ana Sato", avatar_url: "https://photo" }),
        ],
      }),
    );
    expect(account).toEqual({
      anonymous: false,
      email: "ana@example.com",
      name: "Ana Sato",
      avatarUrl: "https://photo",
    });
  });

  it("falls back to the user metadata", () => {
    const account = accountOf(
      user({ user_metadata: { name: "Ana", picture: "https://pic" } }),
    );
    expect(account).toMatchObject({ name: "Ana", avatarUrl: "https://pic" });
  });

  it("prefers the name and photo saved in the Profile settings", () => {
    const account = accountOf(
      user({
        user_metadata: {
          full_name: "Ana Sato",
          avatar_url: "https://photo",
          display_name: "Ana",
          photo_url: "https://mine",
        },
      }),
    );
    expect(account).toMatchObject({
      name: "Ana",
      avatarUrl: "https://mine",
    });
  });

  it("has no name or photo for an anonymous user", () => {
    expect(accountOf(user({ is_anonymous: true, email: undefined }))).toEqual({
      anonymous: true,
      email: null,
      name: null,
      avatarUrl: null,
    });
  });

  it("is anonymous without a user", () => {
    expect(accountOf(null).anonymous).toBe(true);
  });
});
