#![allow(clippy::not_unsafe_ptr_arg_deref)]
use swc_core::{
    ecma::{ast::Program, visit::FoldWith},
    plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

#[plugin_transform]
fn swc_plugin(program: Program, data: TransformPluginProgramMetadata) -> Program {
    let config: onlook::Config = serde_json::from_str::<Option<onlook::Config>>(
        &data
            .get_transform_plugin_config()
            .expect("failed to get plugin config for onlook-react"),
    )
    .expect("invalid packages")
    .unwrap_or_else(|| onlook::Config::All(true));

    let source_map = std::sync::Arc::new(data.source_map);
    program.fold_with(&mut onlook::preprocess(config, source_map))
}
