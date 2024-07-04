

## Large Miletones

### Browser
  * [X] Show browser websites
  * [X] Navigation
  * [ ] Add protocols  
  * [ ] Auth

### Editor
  * [X] Select elements
    * [ ] Multi-select
  * [X] Edit element style
    * [ ] Autolayout
    * [ ] Hover states
    * [ ] Checkpoints
  * [ ] History
    * [ ] Undo 
    * [ ] Redo
  * [ ] Edit text
  * [ ] Structural changes
    * [ ] Insert
    * [ ] Delete
    * [ ] Move

### Variables
  * [ ] Read style from variables
  * [ ] Get variables from stylesheet

### Code
  * [X] Read code block
  * [X] Translate to code
  * [X] Write to file

### Collaboration
  * [ ] Teams
  * [ ] Liveblocks

### Components
  * [ ] Show avaiable elements

### Project
  * [ ] Local persistence
  * [ ] Cloud sync

## Specific improvements
* [ ] Overlay should be React components
   1. Easier to add UI and functionalities on top such as toolbar
   2. Add drag to resize
* [ ] Explore using WebContentsView instead of WebViews tag
    1. WebViews are not officially supported by Electron
    2. Not being part of the DOM makes WebContentsView unattractive but gives more control. 
    3. [See docs here](https://www.electronjs.org/docs/latest/tutorial/web-embeds)