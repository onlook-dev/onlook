import React from "react"
import { createBoard } from "@wixc3/react-board"

import Home from "../../../app/page"

export default createBoard({
  name: "Home",
  Board: () => <Home />,
  isSnippet: true,
})
