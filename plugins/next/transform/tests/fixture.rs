use onlook::Options;
use std::path::PathBuf;
use swc_common::FileName;
use swc_common::{chain, Mark};
use swc_ecma_parser::{EsConfig, Syntax};
use swc_ecma_transforms_base::resolver;
use swc_ecma_transforms_testing::{test_fixture, FixtureTestConfig};

fn syntax() -> Syntax {
    Syntax::Es(EsConfig {
        jsx: true,
        ..Default::default()
    })
}

#[testing::fixture("tests/fixture/**/input.js")]
fn fixture(input: PathBuf) {
    let output = input.parent().unwrap().join("output.js");
    let source_map = Default::default();
    test_fixture(
        syntax(),
        &|_tr| {
            let unresolved_mark = Mark::new();
            let top_level_mark = Mark::new();
            let file_name = FileName::Real(input.clone()).to_string();
            chain!(
                resolver(unresolved_mark, top_level_mark, false),
                onlook::onlook(
                    if input.to_string_lossy().contains("custom") {
                        onlook::Config::WithOptions(Options {
                            properties: vec!["^data-custom$".into()],
                        })
                    } else {
                        onlook::Config::All(true)
                    },
                    file_name,
                    source_map
                )
            )
        },
        &input,
        &output,
        FixtureTestConfig {
            ..Default::default()
        },
    );
}
