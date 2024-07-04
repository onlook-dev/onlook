use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Position {
    pub(crate) line: usize,
    pub(crate) column: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TagInfo {
    pub(crate) start: Position,
    pub(crate) end: Position,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateNode {
    pub(crate) path: String,
    pub(crate) startTag: TagInfo,
    pub(crate) endTag: Option<TagInfo>,
}
