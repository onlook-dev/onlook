import { Routes } from "@/utils/constants";
import { redirect } from "next/navigation";

export default function Page() {
    redirect(Routes.PROJECTS);
}