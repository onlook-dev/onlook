import { createClient } from '@/utils/supabase/server'
import AccountForm from './account-form'

export default async function Account() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    return <AccountForm user={user} />
}