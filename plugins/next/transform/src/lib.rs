pub mod helpers;
pub use helpers::{compress::compress, TemplateNode};
use helpers::{get_template_node, is_custom_component};
use serde::Deserialize;
use std::sync::Arc;
use swc_common::SourceMapper;
use swc_ecma_ast::*;
use swc_ecma_visit::{noop_visit_mut_type, VisitMut, VisitMutWith};

#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
pub enum Config {
    All(bool),
    WithOptions(Options),
}

#[derive(Clone, Debug, Deserialize)]
pub struct Options {}

pub fn preprocess(
    config: Config,
    source_map: Arc<dyn SourceMapper>,
    template_stack: Vec<TemplateNode>,
) -> impl VisitMut {
    TransformVisitor::new(config, source_map, template_stack)
}

struct TransformVisitor {
    config: Config,
    source_map: Arc<dyn SourceMapper>,
    template_stack: Vec<TemplateNode>,
}

impl TransformVisitor {
    fn new(
        config: Config,
        source_map: Arc<dyn SourceMapper>,
        template_stack: Vec<TemplateNode>,
    ) -> Self {
        Self {
            config,
            source_map,
            template_stack,
        }
    }
}

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
        let source_mapper: &dyn SourceMapper = self.source_map.get_code_map();
        let template = get_template_node(el.clone(), source_mapper);
        self.template_stack.push(template);

        if !is_custom_component(&el.opening) {
            let json = serde_json::to_value(&self.template_stack).unwrap();
            let stack_value = compress(&json).unwrap();
            let data_attribute = JSXAttrOrSpread::JSXAttr(JSXAttr {
                span: el.span,
                name: JSXAttrName::Ident(Ident {
                    sym: "data-onlook-id".into(),
                    span: el.span,
                    optional: false,
                }),
                value: Some(JSXAttrValue::Lit(Lit::Str(Str {
                    span: el.span,
                    value: stack_value.into(),
                    raw: None,
                }))),
            });

            el.opening.attrs.push(data_attribute);
            self.template_stack.clear();
        }

        el.visit_mut_children_with(self);
    }
}
