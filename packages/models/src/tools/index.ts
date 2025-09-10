import { z } from 'zod';

export interface WebSearchResult {
    result: {
        title: string;
        url: string;
        text: string;
        publishedDate: string | null;
        author: string | null;
    }[];
    error: string | null;
}

export const DesignSchema = z.object({
    sections: z
        .array(
            z.object({
                type: z
                    .string()
                    .describe(
                        'The type of the section, e.g., "navBar", "hero", "footer", "sidebar", etc.',
                    ),
                description: z
                    .string()
                    .describe('A description of the content and purpose of this section.'),
                styles: z.string().describe('The styles of the section.'),
            }),
        )
        .describe(
            'A list of sections representing the structure of the web page, each with a description and styles.',
        ),
});

export const CloneWebsiteResultSchema = z
    .object({
        result: z
            .object({
                markdown: z.string().describe('The markdown representation of the cloned website.'),
                html: z.string().describe('The HTML content of the cloned website.'),
                designScreenshot: z
                    .string()
                    .describe("A screenshot (as a URL or base64 string) of the website's design."),
                designDocument: DesignSchema.nullable().describe(
                    "A structured design document describing the website's layout and style, or null if unavailable.",
                ),
                assets: z
                    .array(
                        z.object({
                            url: z.string().describe('The URL of the asset.'),
                            title: z.string().describe('The title of the asset.'),
                            fileLocation: z
                                .string()
                                .optional()
                                .describe('The file location of the asset.'),
                        }),
                    )
                    .describe('A list of asset objects with URL and derived title (alt-based).'),
            })
            .nullable()
            .describe(
                'The result object containing the cloned website data, or null if cloning failed.',
            ),
        error: z
            .string()
            .nullable()
            .describe('An error message if cloning failed, or null if successful.'),
    })
    .describe(
        'The response schema for the clone website API endpoint, containing either the result or an error.',
    );

export type CloneWebsiteResult = z.infer<typeof CloneWebsiteResultSchema>;

export interface CheckErrorsResult {
    success: boolean;
    message: string;
    errors: {
        sourceId: string;
        type: string;
        content: string;
        branchId: string;
        branchName: string;
    }[];
    count: number;
}
