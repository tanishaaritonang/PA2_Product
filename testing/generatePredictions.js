import fs from "fs/promises";
import { progressConversation } from "./main.js";

const sessionId = "session-eval";
const userId = "4c18e220-ed08-474e-aac5-5ee93d8e263c";

async function runEvaluation() {
  const raw = await fs.readFile("questions.json", "utf-8");
  const questions = JSON.parse(raw);

  const results = [];

  for (const item of questions) {
    console.log(`Kirim pertanyaan: ${item.question}`);

    const start = Date.now(); // mulai hitung waktu
    const prediction = await progressConversation(item.question, sessionId, userId);
    const end = Date.now();   // selesai hitung waktu

    const duration = end - start; // selisih dalam ms

    results.push({
      question: item.question,
      groundTruth: item.groundTruth,
      prediction: prediction,
      timestamp: new Date().toISOString(),
      responseTimeMs: duration
    });

    console.log(`Response Time: ${duration} ms`);
    console.log(`Dapat jawaban: ${prediction.substring(0, 60)}...`);
  }

  await fs.writeFile("hasil_testing2.json", JSON.stringify(results, null, 2), "utf-8");
  console.log("\nSemua hasil disimpan ke hasil_testing2.json!");
}

runEvaluation().catch((err) => {
  console.error("Error:", err);
});
