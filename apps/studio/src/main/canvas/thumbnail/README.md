# Project thumbnails

Project cards show the current Canvas page, composed by main without Onlook's controls.

The compositor's section colours and corner shapes are copied by hand from the theme and `renderer/src/canvas/SectionNode.tsx`. Change either and the thumbnails fall out of step without any error.

Canvas text is drawn in a temporary, sandboxed offscreen page per capture (`text-render.ts`), with no app bridge and no remote loads, destroyed on success, failure or timeout. A label that fails or is too large falls back to a muted box. The live Canvas and its camera play no part.
