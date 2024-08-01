mod helpers;
use helpers::get_template_node;
use serde::Deserialize;
use std::sync::Arc;
use swc_common::SourceMapper;
use swc_ecma_ast::*;
use swc_ecma_visit::{noop_visit_mut_type, VisitMut, VisitMutWith};

pub fn preprocess(config: Config, source_map: Arc<dyn SourceMapper>) -> impl VisitMut {
    TransformVisitor::new(config, source_map)
}

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

impl VisitMut for TransformVisitor {
    noop_visit_mut_type!();

    fn visit_mut_jsx_element(&mut self, el: &mut JSXElement) {
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
        el.visit_mut_children_with(self);
    }

    fn visit_mut_fn_decl(&mut self, func_decl: &mut FnDecl) {
        self.component_stack.push(func_decl.ident.sym.to_string());
        let func_d = func_decl.visit_mut_children_with(self);
        self.component_stack.pop();
        func_d
    }

    fn visit_mut_var_decl(&mut self, var_decl: &mut VarDecl) {
        let mut pushed = false;
        if let Some(decl) = var_decl.decls.first() {
            if let Some(ident) = &decl.name.as_ident() {
                self.component_stack.push(ident.sym.to_string());
                pushed = true;
            }
        }
        let var_d = var_decl.visit_mut_children_with(self);

        if pushed {
            self.component_stack.pop();
        }
        var_d
    }

    fn visit_mut_class_decl(&mut self, class_decl: &mut ClassDecl) {
        self.component_stack.push(class_decl.ident.sym.to_string());
        let class_d = class_decl.visit_mut_children_with(self);
        self.component_stack.pop();
        class_d
    }

    fn visit_mut_export_default_decl(&mut self, n: &mut ExportDefaultDecl) {
        if let DefaultDecl::Fn(func) = &mut n.decl {
            self.component_stack.push(
                <std::option::Option<swc_ecma_ast::Ident> as Clone>::clone(&func.ident)
                    .unwrap()
                    .sym
                    .to_string(),
            );
            func.visit_mut_children_with(self);
            self.component_stack.pop();
        }
    }
}
