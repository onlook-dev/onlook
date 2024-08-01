mod compress;
mod node;
use compress::compress;
use node::{Position, TagInfo, TemplateNode};
use swc_common::{source_map::Pos, SourceMapper, Span};
use swc_ecma_ast::*;

pub fn get_template_node(
    el: JSXElement,
    source_mapper: &dyn SourceMapper,
    component_stack: &mut Vec<String>,
) -> String {
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
    };

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

pub fn get_span_info(span: Span, source_mapper: &dyn SourceMapper) -> (usize, usize, usize, usize) {
    let span_lines = source_mapper.span_to_lines(span).unwrap().lines;
    let start_line: usize = span_lines[0].line_index + 1;
    let end_line: usize = span_lines.last().unwrap().line_index + 1;
    let start_column: usize = span_lines[0].start_col.to_usize() + 1;
    let end_column: usize = span_lines.last().unwrap().end_col.to_usize() + 1;
    (start_line, end_line, start_column, end_column)
}
