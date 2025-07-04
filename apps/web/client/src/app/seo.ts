export const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Onlook",
    url: "https://onlook.com/",
    logo: "https://onlook.com/favicon.ico",
    sameAs: [
        "https://github.com/onlook-dev/onlook",
        "https://twitter.com/onlookdev",
        "https://www.linkedin.com/company/onlook-dev/",
    ],
};

export const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "What kinds of things can I design with Onlook?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "You can prototype, ideate, and create websites from scratch with Onlook",
            },
        },
        {
            "@type": "Question",
            name: "Why would I use Onlook?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "When you design in Onlook you design in the real product – in other words, the source of truth. Other products are great for ideating, but Onlook is the only one that lets you design with the existing product and the only one that translates your designs to code instantly.",
            },
        },
        {
            "@type": "Question",
            name: "Who owns the code that I write with Onlook?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "The code you make with Onlook is all yours. Your code is written locally directly to your files, and isn't hosted off your device.",
            },
        },
    ],
};
