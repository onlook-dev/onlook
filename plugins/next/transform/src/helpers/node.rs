use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateNode {
    pub(crate) path: String,
    pub(crate) startTag: TemplateTag,
    pub(crate) endTag: Option<TemplateTag>,
    pub(crate) component: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateTag {
    pub(crate) start: TemplateTagPosition,
    pub(crate) end: TemplateTagPosition,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TemplateTagPosition {
    pub(crate) line: usize,
    pub(crate) column: usize,
}
