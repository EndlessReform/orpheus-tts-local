from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional

from gguf_orpheus import generate_speech_from_api
from decoder import get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server is starting up...")
    model, _ = get_model()
    app.state.decoder_model = model
    yield
    print("Server is shutting down...")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpeechRequest(BaseModel):
    input: str
    voice: str = "tara"
    instructions: Optional[str] = None
    model: Optional[str] = None


@app.post("/v1/audio/speech")
async def generate_speech(request: SpeechRequest):
    try:
        audio_data = generate_speech_from_api(request.input, request.voice)

        return {"audio": "no audio"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--port", type=int, default=8000, help="Port to run the server on"
    )
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
