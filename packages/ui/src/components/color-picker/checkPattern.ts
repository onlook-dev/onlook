import { css } from '@emotion/react';

export function checkPattern(
    color0: string,
    color1: string,
    size: string,
    offsetX = '0px',
    offsetY = '0px',
) {
    return css`
        background-color: ${color0};
        background-image:
            linear-gradient(
                45deg,
                ${color1} 25%,
                transparent 25%,
                transparent 75%,
                ${color1} 75%,
                ${color1}
            ),
            linear-gradient(
                45deg,
                ${color1} 25%,
                transparent 25%,
                transparent 75%,
                ${color1} 75%,
                ${color1}
            );
        background-position:
            ${offsetX} ${offsetY},
            calc(${size} / 2 + ${offsetX}) calc(${size} / 2 + ${offsetY});
        background-size: ${size} ${size};
    `;
}
