from bert_score import score
import json
import csv
from datetime import datetime


with open("hasil_testing2.json", "r", encoding="utf-8") as f:
    data = json.load(f)


predictions = [item["prediction"] for item in data]
references = [item["groundTruth"] for item in data]
P, R, F1 = score(predictions, references, lang="id", verbose=True)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")


json_output = {
    "metadata": {
        "evaluation_date": datetime.now().isoformat(),
        "total_questions": len(data)
    },
    "overall_scores": {
        "precision": P.mean().item(),
        "recall": R.mean().item(),
        "f1": F1.mean().item()
    },
    "detailed_results": [
        {
            "question_id": idx+1,
            **item,
            "scores": {
                "precision": p.item(),
                "recall": r.item(),
                "f1": f.item()
            }
        }
        for idx, (item, p, r, f) in enumerate(zip(data, P, R, F1))
    ]
}

with open(f"evaluation_results_{timestamp}.json", "w", encoding="utf-8") as f:
    json.dump(json_output, f, indent=2, ensure_ascii=False)


with open(f"evaluation_results_{timestamp}.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["ID", "Question", "Ground Truth", "Prediction", "Precision", "Recall", "F1"])
    writer.writerows([
        [i+1, q["question"], q["groundTruth"], q["prediction"], 
        f"{p:.4f}", f"{r:.4f}", f"{f:.4f}"]
        for i, (q, p, r, f) in enumerate(zip(data, P, R, F1))
    ])

print(f"""
Selesai! Hasil evaluasi tersimpan dalam:
- JSON: evaluation_results_{timestamp}.json
- CSV : evaluation_results_{timestamp}.csv
""")