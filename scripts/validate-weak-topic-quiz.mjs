const baseUrl = String(
  process.env.MEDSLIME_BASE_URL ?? "https://medslime.vercel.app",
).replace(/\/$/, "");

const subject = "臨床生理學與病理學";
const topic = "心血管生理";
const subtopic = "心律不整與心電圖判讀";

async function fetchTarget(params) {
  const query = new URLSearchParams({
    from: "106",
    to: "115",
    subject,
    count: "5",
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

function validatePayload(payload, expectedSubtopic = null) {
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
    if (expectedSubtopic && question.subtopic !== expectedSubtopic) {
      throw new Error(
        `Question ${question.id} escaped subtopic filter: ${String(question.subtopic)}`,
      );
    }
  }
  return questions.length;
}

async function main() {
  console.log("MedSlime Phase D weak-topic quiz smoke test");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");

  const topicPayload = await fetchTarget({});
  const topicCount = validatePayload(topicPayload);
  console.log(`Topic pool: ${topic} -> ${topicCount} sampled / ${topicPayload.meta?.availableCount ?? "?"} available`);

  const subtopicPayload = await fetchTarget({ subtopic });
  const subtopicCount = validatePayload(subtopicPayload, subtopic);
  console.log(`Subtopic pool: ${subtopic} -> ${subtopicCount} sampled / ${subtopicPayload.meta?.availableCount ?? "?"} available`);
  console.log("");
  console.log("PASS: weak Topic/Subtopic filters only return classified matching questions.");
}

main().catch((error) => {
  console.error("");
  console.error(`Validation failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
