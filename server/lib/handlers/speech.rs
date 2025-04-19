use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::{Json, extract::State, response::IntoResponse};
use futures::stream::{self, Stream};
use mistralrs::{RequestBuilder, SamplingParams, StopTokens, TextMessageRole, TextMessages};
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
    let sampling = SamplingParams {
        temperature: Some(0.9),
        top_k: Some(128),
        frequency_penalty: Some(1.1),
        top_p: Some(0.9),
        max_len: Some(1200),
        min_p: None,
        stop_toks: Some(StopTokens::Ids(vec![128258])), // <custom_token_2> = EOT
        top_n_logprobs: 0,
        presence_penalty: None,
        logits_bias: None,
        n_choices: 1,
        dry_params: None,
    };

    let request = RequestBuilder::new()
        .add_message(TextMessageRole::User, &req.input)
        .set_sampling(sampling);

    let res = state.backbone.send_chat_request(request).await.unwrap();
    // Do nothing with it for now, just testing if it even works
    println!("Res: {:?}", res.usage);
    println!("Res: {:?}", res.choices[0].message.content);

    // Replace with actual streaming logic using state.backbone
    let stream = generate_speech_stream(&req.input, &req.voice, req.instructions.as_deref());
    let body = Body::from_stream(stream);
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_static("audio/pcm"));
    headers.insert("Transfer-Encoding", HeaderValue::from_static("chunked"));
    (StatusCode::OK, headers, body)
}
