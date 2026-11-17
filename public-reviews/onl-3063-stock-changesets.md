# Changesets dependency review

ONL-3063 removes the editor-specific changeset checker and version cutter.
The dependency maps and lockfile are unchanged. The ledger retains the
ONL-3057 dependency hashes and points here because its original audit is removed.

`@changesets/cli` 2.31.0 remains an exact root development dependency from
the upstream Changesets project. It collects contributor entries and checks
their status in CI. Studio does not import it or distribute it as a runtime
dependency.

The prior review of the resolved dependency tree recorded MIT for the CLI,
its Changesets and Manypkg dependencies, and the newly introduced versions.
For spawndamnit 3.0.1, its LICENSE carries the MIT grant and attribution.
Existing dependencies retain their upstream declarations and notices,
including ISC and argparse's Python-2.0 terms. No license text, required
attribution, distributed asset or runtime dependency changes here.

The existing development-tooling use and notice decision remain unchanged.
This record preserves dependency evidence, not publication approval.
