from sentence_transformers import CrossEncoder
import json

# Load model
model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# Load conversation JSON
with open("chatlog.json", "r", encoding="utf-8") as f:
    conversations = json.load(f)

# Filter per session
session_id = "1753414292280"
session = [c for c in conversations if c["session_id"] == session_id]
session = sorted(session, key=lambda x: x["created_at"])

# Extract turns: question → response → ...
turns = []
temp_q = None

for msg in session:
    if msg["message_type"] == "question":
        temp_q = msg["body"]
    elif msg["message_type"] == "response" and temp_q:
        turns.append({"question": temp_q, "answer": msg["body"]})
        temp_q = None

# Set window size (berapa pertanyaan sebelumnya ingin dimasukkan sebagai konteks)
context_window = 2

# Build contextual inputs
coherence_inputs = []
for i in range(len(turns)):
    # Ambil pertanyaan sebelumnya sebanyak `context_window`
    context = " [SEP] ".join(t["question"] for t in turns[max(0, i - context_window):i])
    current_q = turns[i]["question"]
    full_q = f"{context} [SEP] {current_q}" if context else current_q

    coherence_inputs.append((full_q, turns[i]["answer"]))

# Predict scores
scores = model.predict(coherence_inputs)

# Output
for i, ((question, answer), score) in enumerate(zip(coherence_inputs, scores)):
    print(f"Turn {i+1}")
    print(f"Q (Contextualized): {question}")
    print(f"A: {answer}")
    print(f"Contextual Coherence Score: {score:.2f}")
    print("-" * 40)
