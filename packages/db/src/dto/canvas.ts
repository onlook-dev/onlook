import type { Canvas } from "@onlook/models";
import { v4 as uuidv4 } from 'uuid';
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

export const createDefaultCanvas = (projectId: string): DbCanvas => {
    return {
        id: uuidv4(),
        scale: '0.6',
        x: '0',
        y: '0',
        projectId,
    };
};
