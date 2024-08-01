mod compress;
mod node;
use compress::compress;
use node::{TemplateNode, TemplateTag, TemplateTagPosition};
use swc_common::{source_map::Pos, SourceMapper, Span};
use swc_ecma_ast::*;

pub fn get_template_node(
    el: JSXElement,
    source_mapper: &dyn SourceMapper,
    component_stack: &mut Vec<String>,
) -> String {
    let path: String = source_mapper.span_to_filename(el.span).to_string();
    let start_tag = get_span_info(el.opening.span, source_mapper);
    let end_tag = el
        .closing
        .map(|closing| get_span_info(closing.span, source_mapper));
    let component_name: Option<String> = component_stack.last().cloned();
    let template_node = TemplateNode {
        path: path,
        startTag: start_tag,
        endTag: end_tag,
        component: component_name,
    };
    let json_str: String = serde_json::to_string(&template_node).unwrap();
    let compressed: String = compress(&serde_json::from_str(&json_str).unwrap()).unwrap();
    return compressed;
}

pub fn get_span_info(span: Span, source_mapper: &dyn SourceMapper) -> TemplateTag {
    let span_lines = source_mapper.span_to_lines(span).unwrap().lines;
    let start_line: usize = span_lines[0].line_index + 1;
    let end_line: usize = span_lines.last().unwrap().line_index + 1;
    let start_column: usize = span_lines[0].start_col.to_usize() + 1;
    let end_column: usize = span_lines.last().unwrap().end_col.to_usize();
    let tag = TemplateTag {
        start: TemplateTagPosition {
            line: start_line,
            column: start_column,
        },
        end: TemplateTagPosition {
            line: end_line,
            column: end_column,
        },
    };
    tag
}
