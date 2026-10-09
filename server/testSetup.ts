// Legacy Node router regression tests use an isolated signing key; never used by PHP.
process.env.JWT_SECRET = "vitest-only-signing-key-not-a-production-credential";
