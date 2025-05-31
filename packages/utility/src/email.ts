import freeEmailDomains from 'free-email-domains';

export const isFreeEmail = (email: string) => {
    const domain = email.split('@').at(-1);
    return freeEmailDomains.includes(domain ?? '');
};
