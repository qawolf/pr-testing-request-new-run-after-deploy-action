import { jsonConcurrentLimitSchema } from "./types";

describe("types", () => {
  describe("jsonConcurrentLimitSchema", () => {
    it("fails with invalid JSON", () => {
      const result = jsonConcurrentLimitSchema.safeParse("{");
      expect(result.success).toBe(false);
    });
    it('succeeds with "Infinity"', () => {
      const result = jsonConcurrentLimitSchema.safeParse("Infinity");
      expect(result.success).toBe(true);
    });
    it("succeeds with a number", () => {
      const result = jsonConcurrentLimitSchema.safeParse(JSON.stringify(10));
      expect(result.success).toBe(true);
    });
    it("fails with valid JSON w/ incorrect schema", () => {
      const result = jsonConcurrentLimitSchema.safeParse(JSON.stringify(-1));
      expect(result.success).toBe(false);
    });
  });
});
