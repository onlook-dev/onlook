## High-level architecture

Typical electron architecture with an extra web view that holds the users' page

![Architecture diagram](./assets/hld.png)

## Directory structure
```
plugins─┐       > Plugin library to instrument new projects
        |
demo────┤       > Demo React dashboard
        |
docs────┤       > Docs React app
        |
cli─────┤       > Docs React app
        |
app─────┤       > Electron app
        |
        ├─┬ electron            
        | |
        │ ├─┬ main              > Main Node process
        │ │ └── index           
        | |
        │ └─┬ preload           > Injected scripts
        │   └── browserview     > React front-end entry point
        │   └── webview         > The window inside of canvas
        |
        ├─┬ src                 > React front-end
        │ └── routes            > Pages
        │ └── lib               > Libraries

```