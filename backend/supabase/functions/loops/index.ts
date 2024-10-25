
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

        // Handle when split returns 0 to large length array
        const { firstName, lastName } = extractNames(raw_user_meta_data?.name)

        // Prepare the data for Loops
        const loopsData = {
            email,
            firstName,
            lastName,
            source: "App",
            userGroup: "User List",
            mailingLists: {
                "clz1qcgdp017v0mk34ru58axq": true
            }
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

const cleanNamePart = (namePart: string) => {
    return namePart
        ?.trim()
        ?.replace(/\s+/g, ' ') // Remove extra spaces
        ?.replace(/[^\w\s-]/g, '') // Remove special characters except hyphen
        || ''
}

// Helper function to extract first and last name
const extractNames = (fullName: string) => {
    if (!fullName) {
        return { firstName: '', lastName: '' }
    }

    // Clean the full name first
    const cleanedName = fullName.trim().replace(/\s+/g, ' ')

    // Handle empty or whitespace-only names
    if (!cleanedName) {
        return { firstName: '', lastName: '' }
    }

    // Split the name into parts
    const nameParts = cleanedName.split(' ')

    // Handle single word names
    if (nameParts.length === 1) {
        return {
            firstName: cleanNamePart(nameParts[0]),
            lastName: ''
        }
    }

    // Extract first name and last name(s)
    const firstName = cleanNamePart(nameParts[0])
    const lastName = cleanNamePart(nameParts.slice(1).join(' '))

    return { firstName, lastName }
}