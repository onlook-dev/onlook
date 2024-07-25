use swc_common::{source_map::Pos, SourceMapper, Span};
use swc_ecma_ast::*;
pub mod node;
pub use node::{Position, TagInfo, TemplateNode};
pub mod compress;

pub fn get_template_node(el: JSXElement, source_mapper: &dyn SourceMapper) -> TemplateNode {
    let path: String = source_mapper.span_to_filename(el.span).to_string();

    let (opening_start_line, opening_end_line, opening_start_column, opening_end_column) =
        get_span_info(el.opening.span, source_mapper);

    let start_tag = TagInfo {
        start: Position {
            line: opening_start_line,
            column: opening_start_column,
        },
        end: Position {
            line: opening_end_line,
            column: opening_end_column,
        },
    };

    let mut end_tag: Option<TagInfo> = None;

    // Fill end_tag if el.closing
    if let Some(closing) = el.closing {
        let (closing_start_line, closing_end_line, closing_start_column, closing_end_column) =
            get_span_info(closing.span, source_mapper);

        end_tag = Some(TagInfo {
            start: Position {
                line: closing_start_line,
                column: closing_start_column,
            },
            end: Position {
                line: closing_end_line,
                column: closing_end_column,
            },
        });
    }
    let element_name = get_jsx_element_name(&el.opening.name);

    let template_node = TemplateNode {
        path: path,
        startTag: start_tag,
        endTag: end_tag,
        name: element_name,
    };

    template_node
}

pub fn get_span_info(span: Span, source_mapper: &dyn SourceMapper) -> (usize, usize, usize, usize) {
    let span_lines = source_mapper.span_to_lines(span).unwrap().lines;
    let start_line: usize = span_lines[0].line_index + 1;
    let end_line: usize = span_lines.last().unwrap().line_index + 1;
    let start_column: usize = span_lines[0].start_col.to_usize() + 1;
    let end_column: usize = span_lines.last().unwrap().end_col.to_usize() + 1;
    (start_line, end_line, start_column, end_column)
}

pub fn get_jsx_element_name(name: &JSXElementName) -> String {
    match name {
        JSXElementName::Ident(ident) => ident.sym.to_string(),
        JSXElementName::JSXMemberExpr(member_expr) => {
            format!(
                "{}.{}",
                get_jsx_object_name(&member_expr.obj),
                member_expr.prop.sym
            )
        }
        JSXElementName::JSXNamespacedName(namespaced_name) => {
            format!("{}:{}", namespaced_name.ns.sym, namespaced_name.name.sym)
        }
    }
}

fn get_jsx_object_name(obj: &JSXObject) -> String {
    match obj {
        JSXObject::Ident(ident) => ident.sym.to_string(),
        JSXObject::JSXMemberExpr(member_expr) => {
            format!(
                "{}.{}",
                get_jsx_object_name(&member_expr.obj),
                member_expr.prop.sym
            )
        }
    }
}

pub fn is_custom_component(el: &JSXOpeningElement) -> bool {
    match &el.name {
        JSXElementName::Ident(ident) => {
            let name = ident.sym.to_string();
            !name.is_empty() && name.chars().next().unwrap().is_uppercase()
        }
        JSXElementName::JSXMemberExpr(_) => true,
        _ => false,
    }
}
