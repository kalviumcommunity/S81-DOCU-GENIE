from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
load_dotenv()
import os
from chroma import retrieve_top_examples, ensure_chroma_populated
import requests
import subprocess
import time

app = FastAPI(
    title="Fashion Suggestion Chatbot API",
    description="API for interacting with a fashion chatbot",
    version="1.0.0"
)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start Ollama server if not already running
ollama_process = None
def start_ollama_server():
    global ollama_process
    try:
        # Check if Ollama is already running by trying to connect
        import requests
        try:
            requests.get("http://localhost:11434")
            print("Ollama server already running.")
            return
        except Exception:
            pass
        print("Starting Ollama server...")
        ollama_process = subprocess.Popen(["ollama", "serve"])  # Non-blocking
        # Wait a bit for Ollama to start
        time.sleep(3)
        print("Ollama server started.")
    except Exception as e:
        print(f"Could not start Ollama server: {e}")

# Ensure ChromaDB is populated and Ollama is running on backend startup
enable_chroma_autoload = True
if enable_chroma_autoload:
    ensure_chroma_populated("final.csv")
start_ollama_server()

# Use Ollama for AI response
def generate_response_from_ollama(prompt: str, model: str = "mistral"):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    print(f"[Ollama] Sending prompt: {prompt}")
    try:
        response = requests.post(url, json=payload)
        print(f"[Ollama] Raw response: {response.text}")
        response.raise_for_status()
        try:
            data = response.json()
            print(f"[Ollama] Parsed JSON: {data}")
            return data.get("response", "")
        except Exception as e:
            print(f"[Ollama] Error parsing JSON: {e}")
            print(f"[Ollama] Response content: {response.content}")
            return "[Error: Could not parse Ollama response]"
    except Exception as e:
        print(f"[Ollama] Request failed: {e}")
        import traceback
        traceback.print_exc()
        return f"[Error: Ollama request failed: {e}]"

class Message(BaseModel):
    sender: str
    text: str
    timestamp:str

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Message] = []

class ChatResponse(BaseModel):
    response: str
    suggested_options: Optional[List[str]] = None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        print(f"Received message: {request.message}")
        # Retrieve top vector matches from ChromaDB
        top_examples = retrieve_top_examples(request.message, top_k=3)
        print(f"Top examples: {top_examples}")
        examples_str = "\n".join(
            [f"Q: {ex['question']}\nA: {ex['answer']}" for ex in top_examples]
        )
        # Build prompt for Ollama
        prompt = f"User: {request.message}\n\nHere are some similar Q&A examples:\n{examples_str}\n\nPlease provide a fashion suggestion considering the above details and user preferences."
        print(f"[Chat] Built prompt: {prompt}")
        response_text = generate_response_from_ollama(prompt, model="mistral")
        print(f"[Chat] Ollama response: {response_text}")
        if not response_text or not response_text.strip():
            raise Exception("Ollama returned an empty response.")
        return ChatResponse(
            response=response_text,
            suggested_options=[ex['answer'] for ex in top_examples]
        )
    except Exception as e:
        print(f"[Chat] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "status": "API is running"
    }