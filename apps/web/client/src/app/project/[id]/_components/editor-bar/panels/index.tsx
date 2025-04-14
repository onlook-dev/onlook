"use client";

import { motion } from "motion/react";
import { LayoutPosition } from "./layout-position";
import { Typography } from "./typography";
type EditorBarProps = {
    selectedElement: "div" | "text" | "image";
};

export const Panels = ({ selectedElement }: EditorBarProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-[320px] flex flex-col overflow-y-auto"
            transition={{
                type: "spring",
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            <div className="p-4 pl-0 overflow-y-auto">
                <LayoutPosition className="hidden" />
                <Typography className="" />
            </div>
        </motion.div>
    );
};