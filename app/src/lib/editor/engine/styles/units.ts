export const ELEMENT_STYLE_UNITS = ['px', '%', 'rem', 'em', 'vh', 'vw',]

export const appendCssUnit = (input: string, defaultUnit = "px") => {
  const regex = new RegExp(`^[-+]?\\d*\\.?\\d+(${ELEMENT_STYLE_UNITS.join("|")})?$`);

  if (regex.test(input)) {
    // Check if the input ends with a unit
    if (ELEMENT_STYLE_UNITS.some((unit) => input.endsWith(unit))) {
      return input;
    } else {
      return input + defaultUnit; // Append default unit if no unit is found
    }
  } else {
    throw new Error("Invalid input");
  }
}
