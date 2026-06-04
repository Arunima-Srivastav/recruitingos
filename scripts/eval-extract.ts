import { extractRecruitingMessage } from "@/lib/ai/extract";
import { isOllamaConfigured } from "@/lib/ai/ollama";
import { mockExtract } from "@/lib/mockExtractor";
import {
  formatEvalReport,
  HEURISTIC_MIN_ACCURACY,
  RECRUITING_MESSAGE_FIXTURES,
  runExtractEval,
} from "@/lib/evaluation";

const provider = process.argv.includes("--ollama") ? "ollama" : "heuristic";
const minAccuracy = provider === "ollama" ? 0.5 : HEURISTIC_MIN_ACCURACY;

async function main() {
  if (provider === "ollama" && !isOllamaConfigured()) {
    console.error(
      "Ollama not configured. Set OLLAMA_API_KEY in .env.local or run without --ollama for heuristic-only eval."
    );
    process.exit(1);
  }

  const report = await runExtractEval(
    RECRUITING_MESSAGE_FIXTURES,
    provider === "ollama"
      ? async (rawText, sourceType) => {
          const result = await extractRecruitingMessage(rawText, sourceType);
          return result.data;
        }
      : (rawText) => mockExtract(rawText),
    provider
  );

  console.log(formatEvalReport(report));
  console.log("");

  if (report.accuracy < minAccuracy) {
    console.error(
      `Accuracy ${(report.accuracy * 100).toFixed(1)}% is below threshold ${(minAccuracy * 100).toFixed(0)}%.`
    );
    process.exit(1);
  }

  console.log(
    `Threshold met: ${(minAccuracy * 100).toFixed(0)}% (${provider})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
