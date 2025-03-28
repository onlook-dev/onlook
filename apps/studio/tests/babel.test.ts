import * as t from '@babel/types';
import { removeFontsFromClassName } from '../electron/main/assets/fonts/utils';

describe('removeFontsFromClassName', () => {
    describe('string literal className', () => {
        it('should remove all font classes when removeAll is true', () => {
            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.stringLiteral('font-inter text-lg font-bold'),
            );

            const result = removeFontsFromClassName(classNameAttr, { removeAll: true });
            expect(result).toBe(true);
            expect(t.isStringLiteral(classNameAttr.value)).toBe(true);
            const stringValue = classNameAttr.value as t.StringLiteral;
            expect(stringValue.value).toBe('text-lg font-bold');
        });

        it('should remove specific font class when fontId is provided', () => {
            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.stringLiteral('font-inter text-lg font-roboto'),
            );

            const result = removeFontsFromClassName(classNameAttr, { fontIds: ['inter'] });
            expect(result).toBe(true);
            expect(t.isStringLiteral(classNameAttr.value)).toBe(true);
            const stringValue = classNameAttr.value as t.StringLiteral;
            expect(stringValue.value).toBe('text-lg font-roboto');
        });
    });

    describe('template literal className', () => {
        it('should remove font variable expressions when removeAll is true', () => {
            const templateLiteral = t.templateLiteral(
                [
                    t.templateElement({ raw: 'text-lg ', cooked: 'text-lg ' }, false),
                    t.templateElement({ raw: ' font-bold', cooked: ' font-bold' }, true),
                ],
                [t.memberExpression(t.identifier('inter'), t.identifier('variable'))],
            );

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(templateLiteral),
            );

            const result = removeFontsFromClassName(classNameAttr, { removeAll: true });
            expect(result).toBe(true);
            expect(t.isStringLiteral(classNameAttr.value)).toBe(true);
            const stringValue = classNameAttr.value as t.StringLiteral;
            expect(stringValue.value).toBe('text-lg font-bold');
        });

        it('should remove specific font variable expression when fontId is provided', () => {
            const templateLiteral = t.templateLiteral(
                [
                    t.templateElement({ raw: 'text-lg ', cooked: 'text-lg ' }, false),
                    t.templateElement({ raw: ' ', cooked: ' ' }, false),
                    t.templateElement({ raw: ' font-bold', cooked: ' font-bold' }, true),
                ],
                [
                    t.memberExpression(t.identifier('inter'), t.identifier('variable')),
                    t.memberExpression(t.identifier('roboto'), t.identifier('variable')),
                ],
            );

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(templateLiteral),
            );

            const result = removeFontsFromClassName(classNameAttr, { fontIds: ['inter'] });
            expect(result).toBe(true);
            expect(t.isJSXExpressionContainer(classNameAttr.value)).toBe(true);
            const exprContainer = classNameAttr.value as t.JSXExpressionContainer;
            const expr = exprContainer.expression;
            expect(t.isTemplateLiteral(expr)).toBe(true);
            const templateExpr = expr as t.TemplateLiteral;
            expect(templateExpr.expressions.length).toBe(1);
            const memberExpr = templateExpr.expressions[0] as t.MemberExpression;
            const obj = memberExpr.object as t.Identifier;
            expect(obj.name).toBe('roboto');
        });

        it('should handle complex template literal with multiple fonts and static class', () => {
            const templateLiteral = t.templateLiteral(
                [
                    t.templateElement({ raw: 'font-arOneSans ', cooked: 'font-arOneSans ' }, false),
                    t.templateElement({ raw: ' ', cooked: ' ' }, false),
                    t.templateElement({ raw: ' ', cooked: ' ' }, false),
                    t.templateElement({ raw: '', cooked: '' }, true),
                ],
                [
                    t.memberExpression(t.identifier('arOneSans'), t.identifier('variable')),
                    t.memberExpression(t.identifier('acme'), t.identifier('variable')),
                    t.memberExpression(t.identifier('actor'), t.identifier('variable')),
                ],
            );

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(templateLiteral),
            );

            const result = removeFontsFromClassName(classNameAttr, { fontIds: ['arOneSans'] });
            expect(result).toBe(true);
            expect(t.isJSXExpressionContainer(classNameAttr.value)).toBe(true);
            const exprContainer = classNameAttr.value as t.JSXExpressionContainer;
            const expr = exprContainer.expression;
            expect(t.isTemplateLiteral(expr)).toBe(true);
            const templateExpr = expr as t.TemplateLiteral;

            // Should have removed the arOneSans variable but kept the others
            expect(templateExpr.expressions.length).toBe(2);

            // Check that the static 'font-arOneSans' class was removed
            expect(templateExpr.quasis[0].value.raw).not.toContain('font-arOneSans');

            // Check that the remaining expressions are for acme and actor
            const firstExpr = templateExpr.expressions[0] as t.MemberExpression;
            const firstObj = firstExpr.object as t.Identifier;
            expect(firstObj.name).toBe('acme');

            const secondExpr = templateExpr.expressions[1] as t.MemberExpression;
            const secondObj = secondExpr.object as t.Identifier;
            expect(secondObj.name).toBe('actor');
        });
    });

    describe('member expression className', () => {
        it('should remove font member expression when removeAll is true', () => {
            const memberExpr = t.memberExpression(t.identifier('inter'), t.identifier('className'));

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(memberExpr),
            );

            const result = removeFontsFromClassName(classNameAttr, { removeAll: true });
            expect(result).toBe(true);
        });

        it('should remove specific font member expression when fontId is provided', () => {
            const memberExpr = t.memberExpression(t.identifier('inter'), t.identifier('className'));

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(memberExpr),
            );

            const result = removeFontsFromClassName(classNameAttr, { fontIds: ['inter'] });
            expect(result).toBe(true);
        });

        it('should not remove font member expression when fontId does not match', () => {
            const memberExpr = t.memberExpression(t.identifier('inter'), t.identifier('className'));

            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(memberExpr),
            );

            const result = removeFontsFromClassName(classNameAttr, { fontIds: ['roboto'] });
            expect(result).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle non-string literal and non-expression container values', () => {
            const classNameAttr = t.jsxAttribute(
                t.jsxIdentifier('className'),
                t.jsxExpressionContainer(t.nullLiteral()),
            );

            const result = removeFontsFromClassName(classNameAttr, { removeAll: true });
            expect(result).toBe(false);
        });

        it('should handle empty className', () => {
            const classNameAttr = t.jsxAttribute(t.jsxIdentifier('className'), t.stringLiteral(''));

            const result = removeFontsFromClassName(classNameAttr, { removeAll: true });
            expect(result).toBe(true);
            expect(t.isStringLiteral(classNameAttr.value)).toBe(true);
            const stringValue = classNameAttr.value as t.StringLiteral;
            expect(stringValue.value).toBe('');
        });
    });
});
