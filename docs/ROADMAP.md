

## Large Miletones

### Browser
  * [X] Show browser websites
  * [ ] Add protocols  
  * [ ] Handle auth
  * [ ] Handle navigation
### Editor
  * [X] Select elements
  * [ ] Edit element style
  * [ ] Undo redo
  * [ ] Edit text
  * [ ] Structural changes
### Variables
  * [ ] Read style from variables
  * [ ] Get variables from stylesheet
### Code
  * [ ] Translate to code
  * [ ] Write to file
### Collaboration
  * [ ] Add teams
  * [ ] Add liveblocks
### Components
  * [ ] Collect and display elements

## Specific improvements
* [ ] Overlay should be React components
   1. Easier to add UI and functionalities on top such as toolbar
   2. Add drag to resize
* [ ] Explore using WebContentsView instead of WebViews tag
    1. WebViews are not officially supported by Electron
    2. Not being part of the DOM makes WebContentsView unattractive but gives more control. 
    3. [See docs here](https://www.electronjs.org/docs/latest/tutorial/web-embeds)