import type { Font } from "@onlook/models";
import { camelCase } from "lodash";
import * as t from "@babel/types";

export function extractFontConfig(
  fontId: string,
  fontType: string,
  configArg: t.ObjectExpression,
): Font {
  const fontConfig: Record<string, any> = {
    id: fontId,
    family: fontType === "localFont" ? fontId : fontType.replace(/_/g, " "),
    type: fontType === "localFont" ? "local" : "google",
    subsets: [],
    weight: [],
    styles: [],
    variable: "",
  };

  configArg.properties.forEach((prop) => {
    if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) {
      return;
    }

    const propName = prop.key.name;

    if (propName === "variable" && t.isStringLiteral(prop.value)) {
      fontConfig.variable = prop.value.value;
    }

    if (propName === "subsets" && t.isArrayExpression(prop.value)) {
      fontConfig.subsets = prop.value.elements
        .filter((element): element is t.StringLiteral =>
          t.isStringLiteral(element),
        )
        .map((element) => element.value);
    }

    if (
      (propName === "weight" || propName === "weights") &&
      t.isArrayExpression(prop.value)
    ) {
      fontConfig.weight = prop.value.elements
        .map((element) => {
          if (t.isStringLiteral(element)) {
            return element.value;
          } else if (t.isNumericLiteral(element)) {
            return element.value.toString();
          }
          return null;
        })
        .filter(
          (weight): weight is string =>
            weight !== null && !isNaN(Number(weight)),
        );
    }

    if (
      (propName === "style" || propName === "styles") &&
      t.isArrayExpression(prop.value)
    ) {
      fontConfig.styles = prop.value.elements
        .filter((element): element is t.StringLiteral =>
          t.isStringLiteral(element),
        )
        .map((element) => element.value);
    }

    // Handle local font src property
    if (
      propName === "src" &&
      t.isArrayExpression(prop.value) &&
      fontType === "localFont"
    ) {
      const srcConfigs = prop.value.elements
        .filter((element): element is t.ObjectExpression =>
          t.isObjectExpression(element),
        )
        .map((element) => {
          const srcConfig: Record<string, string> = {};
          element.properties.forEach((srcProp) => {
            if (t.isObjectProperty(srcProp) && t.isIdentifier(srcProp.key)) {
              const srcPropName = srcProp.key.name;
              if (t.isStringLiteral(srcProp.value)) {
                srcConfig[srcPropName] = srcProp.value.value;
              }
            }
          });
          return srcConfig;
        });

      fontConfig.weight = [
        ...new Set(srcConfigs.map((config) => config.weight)),
      ];
      fontConfig.styles = [
        ...new Set(srcConfigs.map((config) => config.style)),
      ];
    }
  });

  return fontConfig as Font;
}

/**
 * Helper function to find font class in a string of class names
 */
export function findFontClass(classString: string): string | null {
  if (!classString) return null;
  const fontClassMatch = /font-([a-zA-Z0-9_-]+)/.exec(classString);
  return fontClassMatch?.[1] ?? null;
}

/**
 * Helper function to create a string literal with a font class
 */
export function createStringLiteralWithFont(
  fontClassName: string,
  originalClassName: string,
): t.StringLiteral {
  // Check if there's already a font class
  const classes = originalClassName.split(" ");
  const fontClassIndex = classes.findIndex((cls) => cls.startsWith("font-"));

  if (fontClassIndex >= 0) {
    classes[fontClassIndex] = fontClassName;
  } else {
    classes.unshift(fontClassName);
  }

  return t.stringLiteral(classes.join(" ").trim());
}

/**
 * Helper function to create a template literal that includes a font variable
 */
export function createTemplateLiteralWithFont(
  fontVarExpr: t.Expression,
  originalExpr: t.Expression,
): t.TemplateLiteral {
  const quasis = [
    t.templateElement({ raw: "", cooked: "" }, false),
    t.templateElement({ raw: " ", cooked: " " }, false),
  ];

  if (t.isStringLiteral(originalExpr)) {
    quasis.push(
      t.templateElement(
        {
          raw: originalExpr.value,
          cooked: originalExpr.value,
        },
        true,
      ),
    );
    return t.templateLiteral(quasis, [fontVarExpr]);
  } else {
    quasis.push(t.templateElement({ raw: "", cooked: "" }, true));
    return t.templateLiteral(quasis, [fontVarExpr, originalExpr]);
  }
}

/**
 * Helper function to remove fonts from className attribute
 */
export function removeFontsFromClassName(
  classNameAttr: t.JSXAttribute,
  options: { fontIds: string[] },
): boolean {
  let modified = false;
  const { fontIds } = options;

  if (t.isStringLiteral(classNameAttr.value)) {
    const classes = classNameAttr.value.value.split(" ");
    const newClasses = classes.filter((cls) => {
      // Remove any class that matches a font we're looking for
      return !fontIds.some((id) => cls.includes(camelCase(id)));
    });

    if (newClasses.length !== classes.length) {
      classNameAttr.value.value = newClasses.join(" ");
      modified = true;
    }
  } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
    const expr = classNameAttr.value.expression;

    if (t.isTemplateLiteral(expr)) {
      // For template literals, we need to check all expressions and quasis
      const fontVarIndices: number[] = [];

      expr.expressions.forEach((exp, index) => {
        if (
          t.isMemberExpression(exp) &&
          t.isIdentifier(exp.object) &&
          fontIds.includes(exp.object.name) &&
          t.isIdentifier(exp.property) &&
          exp.property.name === "variable"
        ) {
          fontVarIndices.push(index);
        }
      });

      if (fontVarIndices.length > 0) {
        // Remove matched font expressions
        const newExpressions = expr.expressions.filter(
          (_, i) => !fontVarIndices.includes(i),
        );

        // Check if we're removing all expressions (all fonts)
        if (newExpressions.length === 0) {
          // Convert to string literal to avoid empty template expression
          let combinedString = "";
          expr.quasis.forEach((quasi) => {
            if (quasi?.value?.raw) {
              combinedString += quasi.value.raw;
            }
          });
          combinedString = combinedString.replace(/\s+/g, " ").trim();
          classNameAttr.value = t.stringLiteral(combinedString);
          modified = true;
          return modified;
        }

        // Merge quasis where expressions were removed
        const newQuasis: t.TemplateElement[] = [];
        for (let i = 0; i < expr.quasis.length; i++) {
          const currentQuasi = expr.quasis[i];
          if (!currentQuasi) continue;

          if (fontVarIndices.includes(i - 1) || fontVarIndices.includes(i)) {
            // Skip this quasi or merge with previous
            if (newQuasis.length > 0 && i < expr.quasis.length - 1) {
              const lastQuasi = newQuasis[newQuasis.length - 1];
              if (lastQuasi?.value) {
                lastQuasi.value.raw += currentQuasi.value.raw;
                if (lastQuasi.value.cooked && currentQuasi.value.cooked) {
                  lastQuasi.value.cooked += currentQuasi.value.cooked;
                }
                lastQuasi.tail = currentQuasi.tail;
              }
            } else if (i === 0 || i === expr.quasis.length - 1) {
              newQuasis.push(currentQuasi);
            }
          } else {
            newQuasis.push(currentQuasi);
          }
        }

        // Clean up any consecutive spaces in quasis
        newQuasis.forEach((quasi) => {
          if (quasi?.value) {
            if (quasi.value.raw) {
              quasi.value.raw = quasi.value.raw.replace(/\s+/g, " ").trim();
            }
            if (quasi.value.cooked) {
              quasi.value.cooked = quasi.value.cooked
                .replace(/\s+/g, " ")
                .trim();
            }
          }
        });

        expr.expressions = newExpressions;
        expr.quasis = newQuasis;
        modified = true;
      }
    }
  }

  return modified;
}

