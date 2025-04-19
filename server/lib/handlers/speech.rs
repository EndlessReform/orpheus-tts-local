use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::{Json, extract::State, response::IntoResponse};
use futures::stream::{self, Stream};
use serde::Deserialize;
use std::sync::Arc;

use crate::state::AppState;

#[derive(Deserialize)]
pub struct SpeechRequest {
    pub input: String,
    #[serde(default = "default_voice")]
    pub voice: String,
    pub instructions: Option<String>,
    pub model: Option<String>,
}

fn default_voice() -> String {
    "tara".to_string()
}

// Dummy streaming PCM generator for demonstration. Replace with real logic.
fn generate_speech_stream(
    _input: &str,
    _voice: &str,
    _instructions: Option<&str>,
) -> impl Stream<Item = Result<Vec<u8>, std::io::Error>> + Send + 'static {
    // In real handler, yield PCM audio chunks as Vec<u8>
    let chunks: Vec<Vec<u8>> = vec![vec![0; 1024]; 10]; // 10 dummy chunks
    stream::iter(chunks.into_iter().map(Ok))
}

pub async fn speech_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SpeechRequest>,
) -> impl IntoResponse {
    // Replace with actual streaming logic using state.backbone
    let stream = generate_speech_stream(&req.input, &req.voice, req.instructions.as_deref());
    let body = Body::from_stream(stream);
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_static("audio/pcm"));
    headers.insert("Transfer-Encoding", HeaderValue::from_static("chunked"));
    (StatusCode::OK, headers, body)
}
