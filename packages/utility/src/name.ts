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

/**
 * Generates a unique branch name following macOS-style naming conventions
 * If baseName exists, appends (1), (2), etc. until a unique name is found
 *
 * @param baseName - The base name to start with (e.g., "main", "main (1)")
 * @param existingNames - Array of existing branch names to check against
 * @returns A unique branch name (e.g., "main", "main (1)", "main (2)")
 */
export const generateUniqueBranchName = (baseName: string, existingNames: string[]): string => {
    // Extract the true base name (remove any existing numbering)
    const trueBaseName = extractTrueBaseName(baseName);

    // If the original base name doesn't exist, return it as-is
    if (!existingNames.includes(baseName)) {
        return baseName;
    }

    // Find all existing numbered variations of the true base name
    const numberedPattern = new RegExp(`^${escapeRegExp(trueBaseName)} \\((\\d+)\\)$`);
    const existingNumbers = existingNames
        .map((name) => name.match(numberedPattern))
        .filter((match) => match !== null)
        .map((match) => {
            const numberStr = match![1]!;
            // Only accept numbers that don't have leading zeros (except '0' itself)
            if (numberStr !== '0' && numberStr.startsWith('0')) {
                return NaN;
            }
            return parseInt(numberStr, 10);
        })
        .filter((num) => !isNaN(num))
        .sort((a, b) => a - b);

    // Check if the true base name exists (without numbering)
    const trueBaseNameExists = existingNames.includes(trueBaseName);

    // Find the next available number (always fill gaps first)
    let nextNumber = 1;

    // If the true base name exists and we don't have a (1), then start from (1)
    if (trueBaseNameExists && !existingNumbers.includes(1)) {
        return `${trueBaseName} (1)`;
    }

    // Find the first gap in the sequence
    for (const num of existingNumbers) {
        if (num === nextNumber) {
            nextNumber++;
        } else {
            break;
        }
    }

    // If we're at number 1 and the true base name doesn't exist,
    // but we have numbered versions, start from 1
    if (nextNumber === 1 && !trueBaseNameExists && existingNumbers.length > 0) {
        return `${trueBaseName} (1)`;
    }

    return `${trueBaseName} (${nextNumber})`;
};

/**
 * Extracts the true base name by removing any numbered suffix
 * e.g., "main (1)" -> "main", "main" -> "main"
 */
function extractTrueBaseName(name: string): string {
    const numberedPattern = /^(.+) \(\d+\)$/;
    const match = name.match(numberedPattern);
    return match ? match[1]! : name;
}

/**
 * Helper function to escape special characters in regex patterns
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
