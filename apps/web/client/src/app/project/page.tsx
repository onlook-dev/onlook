import { redirect } from 'next/navigation';

import { Routes } from '@/utils/constants';

export default function Page() {
    redirect(Routes.PROJECTS);
}
