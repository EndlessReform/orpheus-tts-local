use mistralrs::Model;
use std::sync::Arc;

pub struct AppState {
    pub backbone: Arc<Model>,
}
