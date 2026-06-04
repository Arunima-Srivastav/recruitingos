import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockExtract } from "@/lib/mockExtractor";
import {
  HEURISTIC_MIN_ACCURACY,
  RECRUITING_MESSAGE_FIXTURES,
  runExtractEval,
} from "./index";

describe("extraction eval fixtures (heuristic)", () => {
  it("meets minimum field accuracy on labeled fixtures", async () => {
    const report = await runExtractEval(
      RECRUITING_MESSAGE_FIXTURES,
      (rawText) => mockExtract(rawText),
      "heuristic"
    );

    if (report.accuracy < HEURISTIC_MIN_ACCURACY) {
      const failures = report.fixtures
        .flatMap((fixture) =>
          fixture.fields
            .filter((field) => !field.pass)
            .map(
              (field) =>
                `${fixture.id}.${field.field}: expected ${JSON.stringify(field.expected)}, got ${JSON.stringify(field.actual)}`
            )
        )
        .join("\n");

      assert.fail(
        `Heuristic accuracy ${(report.accuracy * 100).toFixed(1)}% below minimum ${(HEURISTIC_MIN_ACCURACY * 100).toFixed(0)}%\n${failures}`
      );
    }

    assert.ok(report.totalFields > 0);
  });
});
