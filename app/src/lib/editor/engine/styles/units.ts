export const ELEMENT_STYLE_UNITS = ['px', '%', 'rem', 'em', 'vh', 'vw',]

export const appendCssUnit = (input: string, defaultUnit = "px") => {
  const regex = new RegExp(`^[-+]?\\d*\\.?\\d+(${ELEMENT_STYLE_UNITS.join("|")})?$`);

  if (regex.test(input)) {
    if (ELEMENT_STYLE_UNITS.some((unit) => input.endsWith(unit))) {
      return input;
    } else {
      return input + defaultUnit;
    }
  } else {
    console.error("Invalid input");
    return input;
  }
}
