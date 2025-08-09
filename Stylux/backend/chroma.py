import chromadb
from sentence_transformers import SentenceTransformer
import pandas as pd
import os

# 1. Load model
model = SentenceTransformer("all-MiniLM-L6-v2")

# 2. Initialize Chroma (persistent storage)
client = chromadb.PersistentClient(path="./chroma_db")
collection_name = "fashion-knowledge"
if collection_name in [c.name for c in client.list_collections()]:
    collection = client.get_collection(name=collection_name)
else:
    collection = client.create_collection(name=collection_name)

def store_examples(csv_path="final.csv"):
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=['skin_tone', 'recommended_outfit_(men)', 'why_this_outfit_(men)', 'shade', 'preferred_colors', 'style'])
    for idx, row in df.iterrows():
        q_id = str(idx)
        question = f"What outfit is recommended for a {row['skin_tone']} skin tone with preferred colors {row['preferred_colors']} and style {row['style']}?"
        answer = row['why_this_outfit_(men)']
        embedding = model.encode(question).tolist()
        collection.add(
            ids=[q_id],
            documents=[question],
            embeddings=[embedding],
            metadatas=[{"answer": answer}]
        )
    print("✅ All examples from final.csv stored in ChromaDB.")

def retrieve_top_examples(query, top_k=3):
    embedding = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k
    )
    return [
        {
            "question": doc,
            "answer": meta["answer"]
        }
        for doc, meta in zip(results["documents"][0], results["metadatas"][0])
    ]

def ensure_chroma_populated(csv_path="final.csv"):
    # Check if collection is empty, if so, populate it
    if collection.count() == 0:
        print("ChromaDB is empty, populating from CSV...")
        store_examples(csv_path)
    else:
        print("ChromaDB already populated.")

def test_chroma_retrieval():
    """Test function to verify ChromaDB retrieval works as expected."""
    test_query = "What outfit is recommended for a fair skin tone with blue colors and casual style?"
    results = retrieve_top_examples(test_query, top_k=3)
    print("Test ChromaDB Retrieval Results:")
    for idx, res in enumerate(results, 1):
        print(f"{idx}. Q: {res['question']}\n   A: {res['answer']}")

if __name__ == "__main__":
    ensure_chroma_populated("final.csv")
    test_chroma_retrieval()
