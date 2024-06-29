// https://developer.mozilla.org/en-US/docs/Web/HTML/Element
interface TagInfo {
  title: string;
  description: string;
}

export const TagMap: Record<string, TagInfo> = {
  html: { title: "Root Element", description: "Represents the root (top-level element) of an HTML document, so it is also referred to as the root element. All other elements must be descendants of this element." },
  head: { title: "Head Element", description: "Contains machine-readable information (metadata) about the document, like its title, scripts, and style sheets." },
  body: { title: "Body", description: "Represents the content of an HTML document. There can be only one such element in a document." },
  h1: { title: "Heading 1", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  h2: { title: "Heading 2", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  h3: { title: "Heading 3", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  h4: { title: "Heading 4", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  h5: { title: "Heading 5", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  h6: { title: "Heading 6", description: "Represent six levels of section headings. <h1> is the highest section level and <h6> is the lowest." },
  div: { title: "Div", description: "The generic container for flow content. It has no effect on the content or layout until styled in some way using CSS (e.g., styling is directly applied to it, or some kind of layout model like flexbox is applied to its parent element)." },
  p: {
    title: "Paragraph", description: "Represents a paragraph. Paragraphs are usually represented in visual media as blocks of text separated from adjacent blocks by blank lines and/or first-line indentation, but HTML paragraphs can be any structural grouping of related content, such as images or form fields."
  },
  span: {
    title: "Span", description: "The <span> HTML element is a generic inline container for phrasing content, which does not inherently represent anything. It can be used to group elements for styling purposes (using the class or id attributes), or because they share attribute values, such as lang. It should be used only when no other semantic element is appropriate. <span> is very much like a <div> element, but <div> is a block-level element whereas a <span> is an inline-level element."
  },
  a: {
    title: "Anchor", description: "<a>	Together with its href attribute, creates a hyperlink to web pages, files, email addresses, locations within the current page, or anything else a URL can address."
  },
  link: {
    title: "Link", description: "Specifies relationships between the current document and an external resource. This element is most commonly used to link to CSS but is also used to establish site icons (both 'favicon' style icons and icons for the home screen and apps on mobile devices) among other things."
  },
  nav: {
    title: "Navigation", description: "Represents a section of a page whose purpose is to provide navigation links, either within the current document or to other documents. Common examples of navigation sections are menus, tables of contents, and indexes."
  },
  i: {
    title: "Idiomatic Text", description: "The <i> HTML element represents a range of text that is set off from the normal text for some reason, such as idiomatic text, technical terms, taxonomical designations, among others. Historically, these have been presented using italicized type, which is the original source of the <i> naming of this element."
  },
  b: {
    title: "Bring Attention", description: "The <b> HTML element is used to draw the reader's attention to the element's contents, which are not otherwise granted special importance. This was formerly known as the Boldface element, and most browsers still draw the text in boldface. However, you should not use <b> for styling text or granting importance. If you wish to create boldface text, you should use the CSS font-weight property. If you wish to indicate an element is of special importance, you should use the <strong> element."
  },
  ul: {
    title: "Unordered List", description: "Represents an unordered list of items, typically rendered as a bulleted list."
  },
  ol: {
    title: "Ordered List", description: "Represents an ordered list of items, typically rendered as a numbered list."
  },
  li: {
    title: "List Item", description: "Represents an item in a list. It can only appear inside a list element, like <ul> or <ol>."
  },
  img: {
    title: "Image", description: "Embeds an image into the document."
  },
  video: {
    title: "Video", description: "Embeds a media player which supports video playback into the document."
  },
  audio: {
    title: "Audio", description: "Embeds a media player which supports audio playback into the document."
  },
  iframe: {
    title: "Inline Frame", description: "Represents a nested browsing context, effectively embedding another HTML page into the current page."
  },
  form: {
    title: "Form", description: "Represents a document section that contains interactive controls to submit information to a web server."
  },
  input: {
    title: "Input", description: "An element is used to create interactive controls for web-based forms in order to accept data from the user."
  },
  label: {
    title: "Label", description: "Represents a caption for an item in a user interface."
  },
  select: {
    title: "Select", description: "Represents a control that provides a menu of options."
  },
  option: {
    title: "Option", description: "Represents an option in a <select> element, or a suggestion of a <datalist> element."
  },
  textarea: {
    title: "Text Area", description: "Represents a multi-line plain-text editing control."
  },
  button: {
    title: "Button", description: "The <button> HTML element is an interactive element activated by a user with a mouse, keyboard, finger, voice command, or other assistive technology. Once activated, it then performs an action, such as submitting a form or opening a dialog. \n\nBy default, HTML buttons are presented in a style resembling the platform the user agent runs on, but you can change buttons' appearance with CSS."
  },
  svg: {
    title: "Scalable Vector Graphics", description: "A language for describing two-dimensional vector graphics in XML."
  },
  path: {
    title: "Path", description: "The <path> SVG element is the generic element to define a shape. All the basic shapes can be created with a path element."
  },
  canvas: {
    title: "Canvas", description: "Provides a resolution-dependent bitmap area, which can be used for rendering graphs, game graphics, or other visual images on the fly."
  },
  footer: {
    title: "Footer", description: "Represents a footer for its nearest sectioning content or sectioning root element. A footer typically contains information about its section such as who wrote it, links to related documents, copyright data, and the like."
  },
  header: {
    title: "Header", description: "Represents introductory content, typically a group of introductory or navigational aids."
  },
  main: {
    title: "Main", description: "Represents the main content of the <body> of a document or application. The main content area consists of content that is directly related to or expands upon the central topic of a document or central functionality of an application."
  },
  section: {
    title: "Section", description: "Represents a standalone section — which doesn't have a more specific semantic element to represent it — contained within an HTML document."
  },
  article: {
    title: "Article", description: "Represents a self-contained composition in a document, page, application, or site, which is intended to be independently distributable or reusable (e.g., in syndication)."
  },
  aside: {
    title: "Aside", description: "Represents a portion of a document whose content is only indirectly related to the document's main content."
  },
  details: {
    title: "Details", description: "Represents additional information or controls which the user can obtain on demand."
  },
  summary: {
    title: "Summary", description: "Represents a summary, caption, or legend for the rest of the contents of the <details> element, if any."
  },
  dialog: {
    title: "Dialog", description: "Represents a dialog box or other interactive component, such as an inspector or window."
  },
  figure: {
    title: "Figure", description: "Represents self-contained content, potentially with an optional caption, which is specified using the (figcaption) element."
  },
  figcaption: {
    title: "Figure Caption", description: "Represents a caption or legend for the rest of the contents of the <figure> element, if any."
  },
  hr: {
    title: "Horizontal Rule", description: "Represents a thematic break between paragraph-level elements: for example, a change of scene in a story, or a shift of topic within a section."
  },
  br: {
    title: "Line Break", description: "Produces a line break in text (carriage-return). It is useful for writing a poem or an address, where the division of lines is significant."
  },
  small: {
    title: "Small", description: "Represents side-comments such as small print."
  },
  strong: {
    title: "Strong", description: "Indicates that its contents have strong importance, seriousness, or urgency."
  },
  em: {
    title: "Emphasis", description: "Represents stress emphasis of its contents."
  },
  mark: {
    title: "Mark", description: "Represents highlighted text, i.e., a run of text marked for reference purpose, due to its relevance in a particular context."
  },
  cite: {
    title: "Citation", description: "Represents the title of a work (e.g. a book, a paper, an essay, a poem, a score, a song, a script, a film, a TV show, a game, a sculpture, a painting, a theater production, a play, an opera, a musical, an exhibition, a legal case report, or a legal code)."
  },
};
