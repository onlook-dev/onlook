import type { Canvas } from '@onlook/models';
import type { UserCanvas as DbUserCanvas } from '../../schema';

export const fromDbCanvas = (dbUserCanvas: DbUserCanvas): Canvas => {
    return {
        id: dbUserCanvas.canvasId,
        scale: Number(dbUserCanvas.scale),
        position: {
            x: Number(dbUserCanvas.x),
            y: Number(dbUserCanvas.y),
        },
    };
};

export const toDbCanvas = (canvas: Canvas): Omit<DbUserCanvas, 'userId'> => {
    return {
        scale: canvas.scale.toString(),
        x: canvas.position.x.toString(),
        y: canvas.position.y.toString(),
        canvasId: canvas.id,
    };
};
