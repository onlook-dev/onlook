const cleanNamePart = (namePart: string) => {
    return (
        namePart
            ?.trim()
            ?.replace(/\s+/g, ' ') // Remove extra spaces
            ?.replace(/[^\w\s-]/g, '') || '' // Remove special characters except hyphen
    );
};

// Helper function to extract first and last name
export const extractNames = (fullName: string) => {
    if (!fullName) {
        return { firstName: '', lastName: '' };
    }

    // Clean the full name first
    const cleanedName = fullName.trim().replace(/\s+/g, ' ');

    // Handle empty or whitespace-only names
    if (!cleanedName) {
        return { firstName: '', lastName: '' };
    }

    // Split the name into parts
    const nameParts = cleanedName.split(' ');

    // Handle single word names
    if (nameParts.length === 1) {
        return {
            firstName: cleanNamePart(nameParts[0] ?? ''),
            lastName: '',
        };
    }

    // Extract first name and last name(s)
    const firstName = cleanNamePart(nameParts[0] ?? '');
    const lastName = cleanNamePart(nameParts.slice(1).join(' '));

    return { firstName, lastName };
};
