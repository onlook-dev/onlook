export function TailwindIndicator() {
  if (process.env.NODE_ENV === "production") return null

  return (
    <div></div>
  )
}
