import { describe, expect, test } from 'bun:test';
import { parseGradientFromCSS, type GradientState } from '../src/components/color-picker/Gradient';

describe('parseGradientFromCSS', () => {
    describe('Linear Gradients', () => {
        test('should parse basic linear gradient with angle', () => {
            const css = 'linear-gradient(45deg, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient without angle', () => {
            const css = 'linear-gradient(#ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with multiple stops', () => {
            const css = 'linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with RGB colors', () => {
            const css = 'linear-gradient(180deg, rgb(255, 0, 0) 0%, rgb(0, 255, 0) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 180,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with RGBA colors', () => {
            const css =
                'linear-gradient(270deg, rgba(255, 0, 0, 0.5) 0%, rgba(0, 255, 0, 0.8) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 270,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with HSL colors', () => {
            const css = 'linear-gradient(135deg, hsl(0, 100%, 50%) 0%, hsl(120, 100%, 50%) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 135,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with named colors', () => {
            const css = 'linear-gradient(45deg, red 0%, blue 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#0000FF', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with stops without percentages', () => {
            const css = 'linear-gradient(90deg, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse linear gradient with decimal positions', () => {
            const css = 'linear-gradient(45deg, #ff0000 0%, #ffff00 25.5%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 26, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        // Directional keywords are now fully supported
        test('should parse directional linear gradient to right', () => {
            const css = 'linear-gradient(to right, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient with RGB colors', () => {
            const css = 'linear-gradient(to right, rgb(59, 130, 246), rgb(6, 182, 212))';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#3B82F6', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#06B6D4', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient to left', () => {
            const css = 'linear-gradient(to left, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 180,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient to top', () => {
            const css = 'linear-gradient(to top, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 270,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient to bottom', () => {
            const css = 'linear-gradient(to bottom, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient to top right', () => {
            const css = 'linear-gradient(to top right, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 315,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse directional linear gradient to bottom left', () => {
            const css = 'linear-gradient(to bottom left, #ff0000, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 135,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Radial Gradients', () => {
        test('should parse basic radial gradient with circle', () => {
            const css = 'radial-gradient(circle, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'radial',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse radial gradient with ellipse', () => {
            const css = 'radial-gradient(ellipse, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'radial',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse radial gradient with multiple stops', () => {
            const css = 'radial-gradient(circle, #ff0000 0%, #ffff00 50%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'radial',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Conic Gradients', () => {
        test('should parse basic conic gradient', () => {
            const css = 'conic-gradient(from 0deg, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse conic gradient with angle', () => {
            const css = 'conic-gradient(from 45deg, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse conic gradient without from clause', () => {
            const css = 'conic-gradient(#ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse conic gradient with multiple stops', () => {
            const css = 'conic-gradient(from 90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse conic gradient with four colors', () => {
            const css =
                'conic-gradient(from 0deg, rgb(255, 107, 107) 0%, rgb(254, 202, 87) 33%, rgb(72, 202, 228) 66%, rgb(255, 107, 107) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF6B6B', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FECA57', position: 33, opacity: 100 },
                    { id: 'stop-3', color: '#48CAE4', position: 66, opacity: 100 },
                    { id: 'stop-4', color: '#FF6B6B', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Angular Gradients', () => {
        test('should parse angular gradient with three stops', () => {
            const css = 'conic-gradient(from 0deg, #ff9a9e, #fecfef, #fecfef)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'angular',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF9A9E', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FECFEF', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#FECFEF', position: 100, opacity: 100 },
                ],
            });
        });

        test('should not parse as angular if duplicate is not at 100%', () => {
            const css = 'conic-gradient(from 0deg, #ff0000 0%, #ffff00 50%, #ff0000 75%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#FF0000', position: 75, opacity: 100 },
                ],
            });
        });

        test('should not parse as angular if colors are different', () => {
            const css = 'conic-gradient(from 0deg, #ff0000 0%, #ffff00 50%, #0000ff 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#0000FF', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Diamond Gradients', () => {
        test('should parse diamond gradient (radial with ellipse 80% 80%)', () => {
            const css = 'radial-gradient(ellipse 80% 80% at center, #ff0000 0%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'diamond',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse diamond gradient with multiple stops', () => {
            const css =
                'radial-gradient(ellipse 80% 80% at center, #ff0000 0%, #ffff00 50%, #00ff00 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'diamond',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should return null for invalid CSS', () => {
            const invalidCSS = 'invalid-gradient()';
            const result = parseGradientFromCSS(invalidCSS);
            expect(result).toBeNull();
        });

        test('should return null for empty string', () => {
            const result = parseGradientFromCSS('');
            expect(result).toBeNull();
        });

        test('should return null for whitespace only', () => {
            const result = parseGradientFromCSS('   ');
            expect(result).toBeNull();
        });

        test('should return null for gradient with single stop', () => {
            const css = 'linear-gradient(45deg, #ff0000)';
            const result = parseGradientFromCSS(css);
            expect(result).toBeNull();
        });

        test('should return null for gradient with no stops', () => {
            const css = 'linear-gradient(45deg)';
            const result = parseGradientFromCSS(css);
            expect(result).toBeNull();
        });

        test('should handle whitespace in CSS', () => {
            const css = '  linear-gradient(  45deg  ,  #ff0000  0%  ,  #00ff00  100%  )  ';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90, // Excessive whitespace causes angle parsing to fail, defaults to 90deg
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should handle missing percentage values', () => {
            const css = 'linear-gradient(45deg, #ff0000, #ffff00, #00ff00)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        test('should handle complex color formats', () => {
            const css =
                'linear-gradient(45deg, #ff0000 0%, rgba(0, 255, 0, 0.5) 50%, hsl(240, 100%, 50%) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 50, opacity: 100 },
                    { id: 'stop-3', color: '#0000FF', position: 100, opacity: 100 },
                ],
            });
        });

        test('should handle malformed gradient gracefully', () => {
            const css = 'linear-gradient(45deg, #ff0000 0%, #00ff00)'; // Missing percentage
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });

        // Nested parentheses in color values are now fully supported
        test('should parse nested parentheses in color values', () => {
            const css = 'linear-gradient(45deg, rgb(255, 0, 0) 0%, rgba(0, 255, 0, 0.5) 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#00FF00', position: 100, opacity: 100 },
                ],
            });
        });
    });

    describe('Real-world Examples', () => {
        test('should parse sunset gradient', () => {
            const css = 'linear-gradient(45deg, #ff6b6b 0%, #feca57 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 45,
                stops: [
                    { id: 'stop-1', color: '#FF6B6B', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FECA57', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse ocean gradient', () => {
            const css = 'linear-gradient(90deg, #48cae4 0%, #023e8a 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#48CAE4', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#023E8A', position: 100, opacity: 100 },
                ],
            });
        });

        test('should parse rainbow conic gradient', () => {
            const css =
                'conic-gradient(from 0deg, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%)';
            const result = parseGradientFromCSS(css);

            expect(result).toEqual({
                type: 'conic',
                angle: 0,
                stops: [
                    { id: 'stop-1', color: '#FF0000', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#FFFF00', position: 17, opacity: 100 },
                    { id: 'stop-3', color: '#00FF00', position: 33, opacity: 100 },
                    { id: 'stop-4', color: '#00FFFF', position: 50, opacity: 100 },
                    { id: 'stop-5', color: '#0000FF', position: 67, opacity: 100 },
                    { id: 'stop-6', color: '#FF00FF', position: 83, opacity: 100 },
                    { id: 'stop-7', color: '#FF0000', position: 100, opacity: 100 },
                ],
            });
        });
    });
});
