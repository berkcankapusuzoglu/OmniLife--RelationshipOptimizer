import { findSecretPatterns } from "./check-secrets.mjs";

describe("findSecretPatterns", () => {
  it("detects a password constant and an unquoted Windows signing assignment", () => {
    const password = "synthetic-" + "credential-value";
    const source = [
      `const PASSWORD = ${JSON.stringify(password)};`,
      `set KEYSTORE_PASSWORD=${password}`,
    ].join("\n");

    expect(findSecretPatterns(source)).toEqual([
      "hardcoded password constant",
      "unquoted Windows password assignment",
    ]);
  });

  it("allows password placeholders in constants and Windows assignments", () => {
    const source = [
      `const PASSWORD = ${JSON.stringify("<" + "password>")};`,
      `set KEYSTORE_PASSWORD=${"<" + "keystore-password>"}`,
    ].join("\n");

    expect(findSecretPatterns(source)).toEqual([]);
  });
});
