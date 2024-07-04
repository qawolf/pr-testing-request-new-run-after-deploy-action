import { z } from "zod";

const concurrentLimitSchema = z.number().or(z.undefined());
export const jsonConcurrentLimitSchema = z
  .string()
  .transform((str, ctx) => {
    if (str === "") return undefined;
    if (str === "Infinity") return 0;
    const parsed = parseInt(str);
    if (isNaN(parsed) || parsed < 0) {
      ctx.addIssue({
        code: "custom",
        message: "input is not a valid number",
      });
      return;
    }

    return parsed;
  })
  .pipe(concurrentLimitSchema);
