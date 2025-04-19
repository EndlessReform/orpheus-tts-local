pub const ORPHEUS_CHAT_TEMPLATE: &'static str = r#"
{%- for m in messages -%}
<|audio|>{{ m.voice }}: {{ m.content }}<|eot_id|>
{%- endfor -%}
{%- if add_generation_prompt -%}
<|audio|>{{ messages[-1].voice }}: 
{%- endif -%}
"#;
