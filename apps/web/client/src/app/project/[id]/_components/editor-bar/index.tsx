"use client";

import { motion } from "motion/react";
<<<<<<< HEAD
import { TextSelected } from "./text-selected";
=======
import type { ElementType } from "react";
>>>>>>> 3c70f5e5 (Tys toolbar v4 (#1786))
import { DivSelected } from "./div-selected";
import { ImgSelected } from "./img-selected";

<<<<<<< HEAD
type EditorBarProps = {
    selectedElement: "div" | "text" | "image";
};

export const EditorBar = ({ selectedElement }: EditorBarProps) => {
=======
export const EditorBar = ({ selectedElement }: { selectedElement: ElementType }) => {
>>>>>>> 3c70f5e5 (Tys toolbar v4 (#1786))
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col border-b-[0.5px] border-border p-1 px-1.5 bg-background backdrop-blur drop-shadow-xl z-50"
            transition={{
                type: "spring",
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            {selectedElement === "text" && <TextSelected />}
            {selectedElement === "div" && <DivSelected />}
            {selectedElement === "image" && <ImgSelected />}
        </motion.div>
    );
};
