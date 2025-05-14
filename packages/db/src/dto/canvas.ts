import type { Canvas } from "@onlook/models";
import type { Canvas as DbCanvas } from "../schema";

export const toCanvas = (dbCanvas: DbCanvas): Canvas => {
    return {
        id: dbCanvas.id,
        scale: Number(dbCanvas.scale),
        position: {
            x: Number(dbCanvas.x),
            y: Number(dbCanvas.y),
        },
    };
};

export const fromCanvas = (projectId: string, canvas: Canvas): DbCanvas => {
    return {
        id: canvas.id,
        scale: canvas.scale.toString(),
        x: canvas.position.x.toString(),
        y: canvas.position.y.toString(),
        projectId,
    };
};
