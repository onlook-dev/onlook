export const elementStyleUnits = ['px', '%', 'rem', 'em', 'vh', 'vw',]

export const appendCssUnit = (input: string, defaultUnit = "px") => {
  const regex = new RegExp(`^[-+]?\\d*\\.?\\d+(${elementStyleUnits.join("|")})?$`);

  if (regex.test(input)) {
    // Check if the input ends with a unit
    if (elementStyleUnits.some((unit) => input.endsWith(unit))) {
      return input;
    } else {
      return input + defaultUnit; // Append default unit if no unit is found
    }
  } else {
    throw new Error("Invalid input");
  }
}

const getViewportDimensions = (): { width: number, height: number } => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height };
};

const getBaseFontSize = () => {
  // Get the computed style of the root HTML element
  const rootStyle = getComputedStyle(document.documentElement);

  // Extract the font-size property value
  const baseFontSize = rootStyle.fontSize;

  // Convert the font size from a string (e.g., "16px") to an integer
  return parseInt(baseFontSize, 10); // Base 10 for decimal
};


export const updateValueToUnit = (oldVal: number, oldUnit: string, newUnit: string): number => {
  // Get base font size
  const { width: viewportWidth, height: viewportHeight } = getViewportDimensions();
  const baseFontSize = getBaseFontSize();

  // Convert oldVal from oldUnit to pixels
  let valueInPx;
  switch (oldUnit) {
    case 'rem':
      valueInPx = oldVal * baseFontSize;
      break;
    case 'vw':
      valueInPx = (oldVal / 100) * viewportWidth;
      break;
    case 'vh':
      valueInPx = (oldVal / 100) * viewportHeight;
      break;
    // Assuming 1% of the viewport width for simplicity, adjust as necessary
    case '%':
      valueInPx = (oldVal / 100) * viewportWidth;
      break;
    case 'px':
    default:
      valueInPx = oldVal;
      break;
  }

  // Convert valueInPx to newUnit
  let newVal;
  switch (newUnit) {
    case 'rem':
      newVal = valueInPx / baseFontSize;
      break;
    case 'vw':
      newVal = (valueInPx / viewportWidth) * 100;
      break;
    case 'vh':
      newVal = (valueInPx / viewportHeight) * 100;
      break;
    // Assuming 1% of the viewport width for simplicity, adjust as necessary
    case '%':
      newVal = (valueInPx / viewportWidth) * 100;
      break;
    case 'px':
    default:
      newVal = valueInPx;
      break;
  }

  return newVal;
};
