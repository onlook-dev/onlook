mod helpers;
use helpers::get_data_onlook_id;
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::Arc;
use swc_common::SourceMapper;
use swc_ecma_ast::*;
use swc_ecma_visit::{noop_fold_type, Fold, FoldWith};

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum Config {
    All(bool),
    WithOptions(Options),
}

impl Config {
    pub fn project_root(&self) -> Option<&str> {
        match self {
            Config::WithOptions(opts) => Some(&opts.project_root),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Options {
    #[serde(rename = "root")]
    pub project_root: String,
}

pub fn preprocess(config: Config, source_map: Arc<dyn SourceMapper>) -> impl Fold {
    AddProperties::new(config, source_map)
}

struct AddProperties {
    config: Config,
    source_map: Arc<dyn SourceMapper>,
}

impl AddProperties {
    fn new(config: Config, source_map: Arc<dyn SourceMapper>) -> Self {
        Self { config, source_map }
    }
}

impl Fold for AddProperties {
    noop_fold_type!();

    fn fold_jsx_element(&mut self, mut el: JSXElement) -> JSXElement {
        // Process children first to ensure last_jsx_closing_line is updated before processing opening element
        el.children = el.children.fold_children_with(self);

        let source_mapper: &dyn SourceMapper = self.source_map.get_code_map();

        let project_root = self
            .config
            .project_root()
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("."));

        let attribute_value: String = get_data_onlook_id(el.clone(), source_mapper, &project_root);

        let data_attribute = JSXAttrOrSpread::JSXAttr(JSXAttr {
            span: el.span,
            name: JSXAttrName::Ident(Ident {
                sym: "data-onlook-id".into(),
                span: el.span,
                optional: false,
            }),
            value: Some(JSXAttrValue::Lit(Lit::Str(Str {
                span: el.span,
                value: attribute_value.into(),
                raw: None,
            }))),
        });

        el.opening.attrs.push(data_attribute);

        el
    }
}
