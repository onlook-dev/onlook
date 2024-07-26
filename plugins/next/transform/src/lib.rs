mod helpers;
use helpers::get_template_node;
use serde::Deserialize;
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
    TransformVisitor::new(config, source_map)
}

struct TransformVisitor {
    config: Config,
    source_map: Arc<dyn SourceMapper>,
    component_stack: Vec<String>,
}

impl TransformVisitor {
    fn new(config: Config, source_map: Arc<dyn SourceMapper>) -> Self {
        Self {
            config,
            source_map,
            component_stack: Vec::new(),
        }
    }
}

impl Fold for TransformVisitor {
    noop_fold_type!();

    fn fold_fn_decl(&mut self, func_decl: FnDecl) -> FnDecl {
        // Check if function is uppercase
        self.component_stack.push(func_decl.ident.sym.to_string());

        // Potentially check for React
        let func_d = func_decl.fold_children_with(self);
        self.component_stack.pop();
        func_d
    }

    fn fold_var_decl(&mut self, var_decl: VarDecl) -> VarDecl {
        let mut pushed = false;
        if let Some(decl) = var_decl.decls.first() {
            if let Some(ident) = &decl.name.as_ident() {
                self.component_stack.push(ident.sym.to_string());
                pushed = true;
            }
        }
        let var_d = var_decl.fold_children_with(self);

        if pushed {
            self.component_stack.pop();
        }
        var_d
    }

    fn fold_jsx_element(&mut self, mut el: JSXElement) -> JSXElement {
        // Process children first to ensure last_jsx_closing_line is updated before processing opening element
        el.children = el.children.fold_children_with(self);

        let source_mapper: &dyn SourceMapper = self.source_map.get_code_map();

        let attribute_value: String =
            get_template_node(el.clone(), source_mapper, &mut self.component_stack);

        let data_attribute: JSXAttrOrSpread = JSXAttrOrSpread::JSXAttr(JSXAttr {
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
