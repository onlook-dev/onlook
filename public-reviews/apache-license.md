# Apache-2.0 licence file

Reviewed November 16, 2026. This is engineering evidence for the reviewed file, not publication clearance. The licence choice follows the public repository this source is published into and is the owner's to confirm (ONL-2761).

## LICENSE

`LICENSE` is new. Its bytes are the `LICENSE` file of the public `onlook-dev/onlook` repository on its default branch, read through the GitHub API on the review date: the Apache License, Version 2.0, with the appendix notice "Copyright 2024 On Off, Inc.". Nothing was edited. The owner confirms the licence and the copyright line before publication.

The root `package.json` and the app, package and test-fixture manifests now carry `"license": "Apache-2.0"`. The download worker's manifest is left for the change that moves it. Every package stays `private`, so none is published to a registry. No dependency field changes, and `bun.lock` is unchanged.

`NOTICE` is unchanged. It preserves upstream licence and attribution evidence for third-party software, and its entries marked for review keep that status. Adding `LICENSE` does not change the terms of any third-party package or asset.
