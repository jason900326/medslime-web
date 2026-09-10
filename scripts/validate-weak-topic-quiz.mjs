const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");

const subject = "臨床生理學與病理學";
const topic = "心血管生理";
const subtopic = "心律不整與心電圖判讀";
const requestedCount = 10;

async function fetchTarget(params) {
  const query = new URLSearchParams({
    from: "106",
    to: "115",
    subject,
    count: String(requestedCount),
    topic,
    ...params,
  });
  const response = await fetch(`${baseUrl}/api/free-quiz?${query.toString()}`, {
    cache: "no-store",
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP ${response.status}: non-JSON response: ${text.slice(0, 500)}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${payload.error ?? text.slice(0, 500)}`);
  }
  return payload;
}

function validateSharedTarget(payload, expectedSubtopic = null) {
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  if (payload.meta?.mode !== "targeted") {
    throw new Error(`Expected targeted mode, got ${String(payload.meta?.mode)}`);
  }
  if (payload.meta?.topic !== topic) {
    throw new Error(`Expected topic ${topic}, got ${String(payload.meta?.topic)}`);
  }
  if ((payload.meta?.subtopic ?? null) !== expectedSubtopic) {
    throw new Error(
      `Expected subtopic ${expectedSubtopic ?? "null"}, got ${String(payload.meta?.subtopic)}`,
    );
  }
  if (questions.length === 0) throw new Error("Targeted pool returned zero questions.");

  for (const question of questions) {
    if (question.topic !== topic) {
      throw new Error(`Question ${question.id} escaped topic filter: ${String(question.topic)}`);
    }
    if (question.taxonomyStatus !== "classified") {
      throw new Error(
        `Question ${question.id} is not classified: ${String(question.taxonomyStatus)}`,
      );
    }
  }
  return questions;
}

function validateTopicPayload(payload) {
  const questions = validateSharedTarget(payload);
  if (payload.meta?.fallbackApplied) {
    throw new Error("Topic-only practice must not report a subtopic fallback.");
  }
  return questions.length;
}

function validateSubtopicPayload(payload) {
  const questions = validateSharedTarget(payload, subtopic);
  const exactAvailable = Number(payload.meta?.exactSubtopicAvailableCount ?? 0);
  const topicAvailable = Number(payload.meta?.topicAvailableCount ?? 0);
  const expectedTotal = Math.min(requestedCount, topicAvailable);
  const exactQuestions = questions.filter((question) => question.subtopic === subtopic);
  const fallbackQuestions = questions.filter((question) => question.subtopic !== subtopic);

  if (questions.length !== expectedTotal) {
    throw new Error(
      `Expected ${expectedTotal} total questions from topic pool, got ${questions.length}.`,
    );
  }

  const expectedExact = Math.min(requestedCount, exactAvailable);
  if (exactQuestions.length !== expectedExact) {
    throw new Error(
      `Expected ${expectedExact} exact subtopic questions, got ${exactQuestions.length}.`,
    );
  }

  const expectedFallback = Math.max(0, expectedTotal - expectedExact);
  if (fallbackQuestions.length !== expectedFallback) {
    throw new Error(
      `Expected ${expectedFallback} same-topic fallback questions, got ${fallbackQuestions.length}.`,
    );
  }

  const fallbackApplied = Boolean(payload.meta?.fallbackApplied);
  if (fallbackApplied !== (expectedFallback > 0)) {
    throw new Error(
      `fallbackApplied mismatch: expected ${expectedFallback > 0}, got ${fallbackApplied}.`,
    );
  }

  if (Number(payload.meta?.exactSubtopicSelectedCount ?? 0) !== exactQuestions.length) {
    throw new Error("exactSubtopicSelectedCount does not match returned questions.");
  }
  if (Number(payload.meta?.topicFallbackSelectedCount ?? 0) !== fallbackQuestions.length) {
    throw new Error("topicFallbackSelectedCount does not match returned questions.");
  }

  if (
    fallbackApplied &&
    payload.meta?.selectionStrategy !== "targeted_subtopic_with_topic_fallback"
  ) {
    throw new Error(`Unexpected fallback strategy: ${String(payload.meta?.selectionStrategy)}`);
  }

  return {
    total: questions.length,
    exactAvailable,
    topicAvailable,
    exactSelected: exactQuestions.length,
    fallbackSelected: fallbackQuestions.length,
    fallbackApplied,
  };
}

async function main() {
  console.log("MedSlime Phase D weak-topic quiz smoke test");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  const topicPayload = await fetchTarget({});
  const topicCount = validateTopicPayload(topicPayload);
  console.log(
    `Topic pool: ${topic} -> ${topicCount} sampled / ${topicPayload.meta?.topicAvailableCount ?? topicPayload.meta?.availableCount ?? "?"} available`,
  );

  const subtopicPayload = await fetchTarget({ subtopic });
  const result = validateSubtopicPayload(subtopicPayload);
  console.log(
    `Subtopic practice: ${subtopic} -> ${result.exactSelected} exact / ${result.exactAvailable} exact available + ${result.fallbackSelected} same-topic fallback = ${result.total} questions`,
  );
  console.log(`Topic pool available for fallback: ${result.topicAvailable}`);
  console.log("");
  console.log(
    "PASS: weak Subtopic practice preserves exact questions first and only fills shortages from the same classified Topic.",
  );
}

main().catch((error) => {
  console.error("");
  console.error(`Validation failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
