use anyhow::Result;
use axum::{
    Router,
    routing::{get, post},
};
use mistralrs::{GgufModelBuilder, PagedAttentionMetaBuilder};
use std::sync::Arc;

use server::handlers::{root::root, speech::speech_handler};
use server::state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    let model = GgufModelBuilder::new(
        "isaiahbjork/orpheus-3b-0.1-ft-Q4_K_M-GGUF",
        vec!["orpheus-3b-0.1-ft-q4_k_m.gguf"],
    )
    .with_chat_template("./resources/orpheus_chat_template.json")
    .with_paged_attn(|| PagedAttentionMetaBuilder::default().build())?
    .build()
    .await?;

    println!("Dummy model loaded");

    let state = Arc::new(AppState {
        backbone: model.into(),
    });

    // build our application with a route
    let app = Router::new()
        // `GET /` goes to `root`
        .route("/", get(root))
        // `POST /users` goes to `create_user`
        .route("/v1/audio/speech", post(speech_handler))
        .with_state(state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
