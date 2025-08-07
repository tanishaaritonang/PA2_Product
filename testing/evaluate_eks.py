from bert_score import score
import json
import csv
from datetime import datetime

# Bobot: total 1.0
weights = [0.1333, 0.6, 0.1333, 0.1333]  # kalimat 1,2,3,4

def split_sentences(text):
    # Bagi berdasarkan newline dulu karena pola kamu pakai \n
    parts = [s.strip() for s in text.split("\n") if s.strip()]
    # Kalau ternyata lebih banyak dari 4, ambil 4 pertama
    return parts[:4]

def weighted_bert_score(prediction, reference):
    # Pisah prediction jadi kalimat
    sentences = split_sentences(prediction)

    total_p = 0.0
    total_r = 0.0
    total_f1 = 0.0
    total_weight = 0.0

    for i, sent in enumerate(sentences):
        w = weights[i] if i < len(weights) else 0.0
        if w == 0:
            continue
        # Hitung bertscore untuk kalimat ini terhadap reference
        P, R, F1 = score([sent], [reference], lang="id", verbose=False)
        total_p += P.mean().item() * w
        total_r += R.mean().item() * w
        total_f1 += F1.mean().item() * w
        total_weight += w

    # Normalisasi
    return total_p / total_weight, total_r / total_weight, total_f1 / total_weight

# Load data
with open("hasil_testing2.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Hitung skor weighted per item
results = []
for idx, item in enumerate(data):
    p, r, f1 = weighted_bert_score(item["prediction"], item["groundTruth"])
    results.append((p, r, f1))

# Hitung rata-rata
avg_p = sum(x[0] for x in results) / len(results)
avg_r = sum(x[1] for x in results) / len(results)
avg_f1 = sum(x[2] for x in results) / len(results)

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

# Simpan JSON
json_output = {
    "metadata": {
        "evaluation_date": datetime.now().isoformat(),
        "total_questions": len(data)
    },
    "overall_scores": {
        "precision": avg_p,
        "recall": avg_r,
        "f1": avg_f1
    },
    "detailed_results": [
        {
            "question_id": idx+1,
            **item,
            "scores": {
                "precision": p,
                "recall": r,
                "f1": f1
            }
        }
        for idx, (item, (p, r, f1)) in enumerate(zip(data, results))
    ]
}

with open(f"evaluation_results_{timestamp}.json", "w", encoding="utf-8") as f:
    json.dump(json_output, f, indent=2, ensure_ascii=False)

# Simpan CSV
with open(f"evaluation_results_{timestamp}.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["ID", "Question", "Ground Truth", "Prediction", "Precision", "Recall", "F1"])
    for i, (q, (p, r, f1)) in enumerate(zip(data, results)):
        writer.writerow([i+1, q["question"], q["groundTruth"], q["prediction"],
                         f"{p:.4f}", f"{r:.4f}", f"{f1:.4f}"])

print(f"""
Selesai! Hasil evaluasi tersimpan dalam:
- JSON: evaluation_results_{timestamp}.json
- CSV : evaluation_results_{timestamp}.csv
""")
