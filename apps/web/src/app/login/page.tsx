'use client'

import { login } from './actions'

export default function LoginPage() {
    return (
        <>
            <button onClick={() => login('github')}>GitHub</button>
            <button onClick={() => login('google')}>Google</button>
        </>
    )
}