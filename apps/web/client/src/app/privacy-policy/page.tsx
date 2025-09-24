'use client';

import { WebsiteLayout } from '../_components/website-layout';

export default function PrivacyPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <main className="flex-1 pt-16">
                <div className="mx-auto max-w-4xl px-8 py-16">
                    <h1 className="text-foreground-primary mb-8 text-4xl font-light">
                        Privacy Policy
                    </h1>
                    <p className="text-foreground-secondary mb-8">
                        Effective date November 8, 2024
                    </p>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-foreground-secondary mb-8">
                            If you have any questions, please write to us at contact@onlook.com
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Introduction
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            At Onlook, we take your privacy seriously. Please read this Privacy
                            Policy to learn how we treat your personal data.{' '}
                            <strong>
                                By using or accessing our Services in any manner, you acknowledge
                                that you accept the practices and policies outlined below, and you
                                hereby consent that we will collect, use and disclose your
                                information as described in this Privacy Policy.
                            </strong>
                        </p>
                        <p className="text-foreground-secondary mb-6">
                            Remember that your use of Onlook's Services is at all times subject to
                            our Terms of Use, which incorporates this Privacy Policy. Any terms we
                            use in this Policy without defining them have the definitions given to
                            them in the Terms of Use.
                        </p>
                        <p className="text-foreground-secondary mb-6">
                            As we continually work to improve our Services, we may need to change
                            this Privacy Policy from time to time. We will alert you of material
                            changes by placing a notice on the Onlook website, by sending you an
                            email and/or by some other means. Please note that if you've opted not
                            to receive legal notice emails from us (or you haven't provided us with
                            your email address), those legal notices will still govern your use of
                            the Services, and you are still responsible for reading and
                            understanding them. If you use the Services after any changes to the
                            Privacy Policy have been posted, that means you agree to all of the
                            changes.
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Privacy Policy Table of Contents
                        </h2>
                        <ul className="text-foreground-secondary mb-6 list-disc pl-6">
                            <li>What this Privacy Policy Covers</li>
                            <li>Personal Data</li>
                            <li>How We Disclose Your Personal Data</li>
                            <li>Tracking Tools, Advertising and Opt-Out</li>
                            <li>Data Security</li>
                            <li>Personal Data of Children</li>
                            <li>Other State Law Privacy Rights</li>
                            <li>Contact Information</li>
                        </ul>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            What this Privacy Policy Covers
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            This Privacy Policy covers how we treat Personal Data that we gather
                            when you access or use our Services. "Personal Data" means any
                            information that identifies or relates to a particular individual and
                            also includes information referred to as "personally identifiable
                            information" or "personal information" under applicable data privacy
                            laws, rules or regulations. This Privacy Policy does not cover the
                            practices of companies we don't own or control or people we don't
                            manage.
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Personal Data
                        </h2>
                        <h3 className="text-foreground-primary mt-8 mb-4 text-xl font-light">
                            Categories of Personal Data We Collect
                        </h3>
                        <p className="text-foreground-secondary mb-6">
                            This chart details the categories of Personal Data that we collect and
                            have collected over the past 12 months:
                        </p>

                        <div className="mb-8 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <th className="text-foreground-primary p-4 text-left">
                                            Category of Personal Data
                                        </th>
                                        <th className="text-foreground-primary p-4 text-left">
                                            Business or Commercial Purpose(s)
                                        </th>
                                        <th className="text-foreground-primary p-4 text-left">
                                            Categories of Third Parties
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Profile or Contact Data
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Providing, Customizing and Improving the Services
                                            <br />• Corresponding with You
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            Service Providers
                                        </td>
                                    </tr>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Payment Data
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            Providing, Customizing and Improving the Services
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            Service Providers (Stripe, Inc)
                                        </td>
                                    </tr>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Device/IP Data
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Providing, Customizing and Improving the Services
                                            <br />• Marketing the Services
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Service Providers
                                            <br />• Advertising Partners
                                        </td>
                                    </tr>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Web Analytics
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Providing, Customizing and Improving the Services
                                            <br />• Marketing the Services
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Service Providers
                                            <br />• Advertising Partners
                                        </td>
                                    </tr>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Social Network Data
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Marketing the Services
                                            <br />• Corresponding with You
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            Service Providers
                                        </td>
                                    </tr>
                                    <tr className="border-foreground-primary/10 border-b">
                                        <td className="text-foreground-secondary p-4">
                                            Geolocation Data
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Providing, Customizing and Improving the Services
                                            <br />• Marketing the Services
                                        </td>
                                        <td className="text-foreground-secondary p-4">
                                            • Service Providers
                                            <br />• Advertising Partners
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className="text-foreground-primary mt-8 mb-4 text-xl font-light">
                            Our Commercial or Business Purposes for Collecting Personal Data
                        </h3>
                        <ul className="text-foreground-secondary mb-6 list-disc pl-6">
                            <li>
                                <strong>Providing, Customizing and Improving the Services</strong>
                                <ul className="mt-2 list-disc pl-6">
                                    <li>
                                        Creating and managing your account or other user profiles.
                                    </li>
                                    <li>Processing orders or other transactions; billing.</li>
                                    <li>
                                        Providing you with the products, services or information you
                                        request.
                                    </li>
                                    <li>
                                        Meeting or fulfilling the reason you provided the
                                        information to us.
                                    </li>
                                    <li>Providing support and assistance for the Services.</li>
                                    <li>
                                        Improving the Services, including testing, research,
                                        internal analytics and product development.
                                    </li>
                                    <li>
                                        Personalizing the Services, website content and
                                        communications based on your preferences.
                                    </li>
                                    <li>Doing fraud protection, security and debugging.</li>
                                    <li>
                                        Carrying out other business purposes stated when collecting
                                        your Personal Data or as otherwise set forth in applicable
                                        data privacy laws.
                                    </li>
                                </ul>
                            </li>
                            <li>
                                <strong>Marketing the Services</strong>
                                <ul className="mt-2 list-disc pl-6">
                                    <li>Marketing and selling the Services.</li>
                                    <li>
                                        Showing you advertisements, including interest-based, online
                                        behavioral or targeted advertising.
                                    </li>
                                </ul>
                            </li>
                            <li>
                                <strong>Corresponding with You</strong>
                                <ul className="mt-2 list-disc pl-6">
                                    <li>
                                        Responding to correspondence that we receive from you,
                                        contacting you when necessary or requested, and sending you
                                        information about Onlook or the Services.
                                    </li>
                                    <li>
                                        Sending emails and other communications according to your
                                        preferences.
                                    </li>
                                </ul>
                            </li>
                        </ul>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            How We Disclose Your Personal Data
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            We disclose your Personal Data to the categories of service providers
                            and other parties listed in this section.
                        </p>
                        <ul className="text-foreground-secondary mb-6 list-disc pl-6">
                            <li>
                                <strong>Service Providers.</strong> These parties help us provide
                                the Services or perform business functions on our behalf. They
                                include:
                                <ul className="mt-2 list-disc pl-6">
                                    <li>Hosting, technology and communication providers.</li>
                                    <li>
                                        Analytics providers for web traffic or usage of the site.
                                    </li>
                                    <li>Security and fraud prevention consultants.</li>
                                    <li>Support and customer service vendors.</li>
                                    <li>Payment processors.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Advertising Partners.</strong> These parties help us market
                                our services and provide you with other offers that may be of
                                interest to you. They include:
                                <ul className="mt-2 list-disc pl-6">
                                    <li>Ad networks.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Parties You Authorize, Access or Authenticate.</strong>
                                <ul className="mt-2 list-disc pl-6">
                                    <li>
                                        Third parties you use to access the Services, such as Google
                                        or GitHub authentication protocols.
                                    </li>
                                </ul>
                            </li>
                        </ul>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Tracking Tools, Advertising and Opt-Out
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            We use cookies and other tracking tools (collectively, "Cookies") to
                            enable our servers to recognize your web browser, tell us how and when
                            you visit and use our Services, analyze trends, learn about our user
                            base and operate and improve our Services. Cookies are small pieces of
                            data– usually text files – placed on your computer, tablet, phone or
                            similar device when you use that device to access our Services. We may
                            also supplement the information we collect from you with information
                            received from third parties, including third parties that have placed
                            their own Cookies on your device(s).
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Data Security
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            We seek to protect your Personal Data from unauthorized access, use and
                            disclosure using appropriate physical, technical, organizational and
                            administrative security measures based on the type of Personal Data and
                            how we are processing that data. You should also help protect your data
                            by appropriately selecting and protecting your password and/or other
                            sign-on mechanism; limiting access to your computer or device and
                            browser; and signing off after you have finished accessing your account.
                            Although we work to protect the security of your account and other data
                            that we hold in our records, please be aware that no method of
                            transmitting data over the internet or storing data is completely
                            secure.
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Personal Data of Children
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            As noted in the Terms of Use, we do not knowingly collect or solicit
                            Personal Data from children under 13 years of age; if you are a child
                            under the age of 13, please do not attempt to register for or otherwise
                            use the Services or send us any Personal Data. If we learn we have
                            collected Personal Data from a child under 13 years of age, we will
                            delete that information as quickly as possible. If you believe that a
                            child under 13 years of age may have provided Personal Data to us,
                            please contact us at contact@onlook.com.
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Other State Law Privacy Rights
                        </h2>
                        <h3 className="text-foreground-primary mt-8 mb-4 text-xl font-light">
                            California Resident Rights
                        </h3>
                        <p className="text-foreground-secondary mb-6">
                            Under California Civil Code Sections 1798.83-1798.84, California
                            residents are entitled to contact us to prevent disclosure of Personal
                            Data to third parties for such third parties' direct marketing purposes;
                            in order to submit such a request, please contact us at
                            contact@onlook.com.
                        </p>

                        <h3 className="text-foreground-primary mt-8 mb-4 text-xl font-light">
                            Nevada Resident Rights
                        </h3>
                        <p className="text-foreground-secondary mb-6">
                            Please note that we do not currently sell your Personal Data as sales
                            are defined in Nevada Revised Statutes Chapter 603A.
                        </p>

                        <h2 className="text-foreground-primary mt-12 mb-6 text-2xl font-light">
                            Contact Information
                        </h2>
                        <p className="text-foreground-secondary mb-6">
                            If you have any questions or comments about this Privacy Policy, the
                            ways in which we collect and use your Personal Data or your choices and
                            rights regarding such collection and use, please do not hesitate to
                            contact us at:
                        </p>
                        <ul className="text-foreground-secondary mb-6 list-disc pl-6">
                            <li>https://onlook.dev/</li>
                            <li>contact@onlook.com</li>
                        </ul>
                    </div>
                </div>
            </main>
        </WebsiteLayout>
    );
}
