import { type CustomDomain } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';

const CustomDomainSection = ({
    customDomains,
    selectedDomains,
    setSelectedDomains,
}: {
    customDomains: CustomDomain[];
    selectedDomains: string[];
    setSelectedDomains: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
    const handleDomainChange = (domain: string, checked: boolean) => {
        setSelectedDomains((prev: string[]) => {
            if (checked) {
                // When selecting a base domain, also select 'www' subdomain if it exists
                const domainObj = customDomains.find((d) => d.domain === domain);
                if (domainObj && domainObj.subdomains.includes('www')) {
                    return [...prev, domain, `www.${domain}`];
                }
                return [...prev, domain];
            } else {
                return prev.filter((d: string) => d !== domain);
            }
        });
    };

    if (!customDomains.length) {
        return (
            <p className="text-small text-foreground-secondary w-full flex justify-center items-center">
                Want to host on your own domain?
                <Button
                    variant="link"
                    className="text-foreground-active mx-2 px-0"
                    onClick={() => {
                        window.open('https://cal.link/my-domain-with-olk', '_blank');
                    }}
                >
                    Contact us
                </Button>
            </p>
        );
    }
    return (
        <div className="flex flex-col items-start justify-start space-y-2">
            <p className="text-small text-foreground-secondary">Publish to your custom domains:</p>
            {customDomains.map((domain) => (
                <div
                    key={domain.id}
                    className="flex flex-col items-start justify-start w-full space-y-1"
                >
                    <label className="flex items-center space-x-2">
                        <Checkbox
                            id={domain.domain}
                            checked={selectedDomains.includes(domain.domain)}
                            onCheckedChange={(checked) =>
                                handleDomainChange(domain.domain, !!checked)
                            }
                        />
                        <span className="text-small text-foreground-secondary">
                            {domain.domain}
                        </span>
                    </label>
                    <div className="flex flex-col items-start justify-start space-y-1">
                        {domain.subdomains.map((subdomain, index) => (
                            <label key={index} className="flex items-center space-x-2 ml-4">
                                <Checkbox
                                    id={`${subdomain}.${domain.domain}`}
                                    checked={selectedDomains.includes(
                                        `${subdomain}.${domain.domain}`,
                                    )}
                                    onCheckedChange={(checked) =>
                                        setSelectedDomains((prev) =>
                                            checked
                                                ? [...prev, `${subdomain}.${domain.domain}`]
                                                : prev.filter(
                                                      (d) => d !== `${subdomain}.${domain.domain}`,
                                                  ),
                                        )
                                    }
                                />
                                <span className="text-small text-foreground-secondary">
                                    {subdomain + '.' + domain.domain}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CustomDomainSection;
