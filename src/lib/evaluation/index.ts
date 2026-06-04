import fixtures from "./fixtures/recruiting-messages.json";
import { runExtractEval } from "./score";
import type { ExtractionFixture } from "./types";

export { EVAL_FIELDS } from "./types";
export type {
  EvalField,
  EvalReport,
  ExtractionFixture,
  ExtractionFixtureExpected,
  FieldMatchResult,
  FixtureEvalResult,
  ExtractFn,
} from "./types";
export {
  formatEvalReport,
  runExtractEval,
  scoreFixture,
} from "./score";

export const RECRUITING_MESSAGE_FIXTURES =
  fixtures as ExtractionFixture[];

/** Minimum field-level accuracy for heuristic regression tests. */
export const HEURISTIC_MIN_ACCURACY = 0.75;
