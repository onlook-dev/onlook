
const LOOPS_API_ENDPOINT = 'https://app.loops.so/api/v1/contacts/create'
const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY')

Deno.serve(async (req) => {
    try {
        // Verify that the request is a POST
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Parse the request body
        const payload = await req.json()

        // Extract user data from the auth.users insert
        const { email, raw_user_meta_data } = payload.record
        const displayName = raw_user_meta_data?.displayName || ''

        const firstName = raw_user_meta_data?.firstName || displayName || ''
        const lastName = raw_user_meta_data?.lastName || ''

        // Prepare the data for Loops
        const loopsData = {
            email,
            firstName,
            lastName,
            source: "App",
            userGroup: "User List"
        }

        // Send the data to Loops
        const loopsResponse = await fetch(LOOPS_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOOPS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loopsData)
        })

        if (!loopsResponse.ok) {
            throw new Error(`Loops API error: ${loopsResponse.statusText}`)
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
