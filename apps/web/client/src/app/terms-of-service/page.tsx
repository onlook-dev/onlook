'use client';

import { WebsiteLayout } from '../_components/website-layout';

export default function TermsPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <main className="flex-1 pt-16">
                <div className="max-w-4xl mx-auto px-8 py-16">
                    <h1 className="text-4xl font-light text-foreground-primary mb-8">Terms of Use</h1>
                    <p className="text-foreground-secondary mb-8">Effective Date November 8, 2024</p>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-foreground-secondary mb-8">
                            If you have any questions, please write to us at contact@onlook.com
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">Introduction</h2>
                        <p className="text-foreground-secondary mb-6">
                            PLEASE READ THESE TERMS OF USE CAREFULLY BEFORE USING THE SERVICES OFFERED BY ON OFF, INC. ("ONLOOK"). BY USING THE SERVICES OR ENTERING ONE OR MORE ORDER FORMS (INCLUDING ANY ONLINE REGISTRATION) (TOGETHER, "REGISTRATION"), YOU ("USER") AGREE TO BE BOUND BY THESE TERMS (TOGETHER WITH THE TERMS OF ANY REGISTRATION, THE "AGREEMENT"). IF YOU ARE ENTERING INTO THIS AGREEMENT ON BEHALF OF AN ENTITY, THEN YOU REPRESENT AND WARRANT THAT YOU ARE AUTHORIZED TO BIND SUCH ENTITY TO THE TERMS OF THIS AGREEMENT.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">1. Access to the Service</h2>
                        <p className="text-foreground-secondary mb-6">
                            Access to the Service. Subject to User's compliance with this Agreement (including the Registration) Onlook grants User a nonexclusive, non-sublicensable, non-transferable right and license to access and use the Onlook product(s) and/or service(s) (the "Services") solely for User's internal business purposes. User (i) agrees to use the Services in compliance with all applicable local, state, national and foreign laws, treaties and regulations in connection with User's use of the Service (including those related to data privacy, international communications, export laws and the transmission of technical or personal data laws), and (ii) agrees not to use the Service in a manner that violates any third party intellectual property, contractual or other proprietary rights. User agrees to maintain the confidentiality of its access credentials and other account information, and to be responsible for any and all activities under its account. Unless separately agreed in writing, Onlook is under no obligation to provide support for the Service.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">2. Fees; Payment</h2>
                        <p className="text-foreground-secondary mb-6">
                            User agrees to pay Onlook the fees as set forth in the Registration, if any ("Fees"). Unless otherwise specified in the Registration, all Fees will be invoiced annually in advance and all invoices issued under this Agreement are payable in U.S. dollars within thirty (30) days from date of invoice. Past due invoices are subject to interest on any outstanding balance of the lesser of 1.5% per month or the maximum amount permitted by law. User will be responsible for all taxes associated with its use of the Services (excluding taxes based on Onlook's net income).
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">3. Ownership; Feedback</h2>
                        <p className="text-foreground-secondary mb-6">
                            Onlook owns and retains all right, title, and interest in and to the Services, and all configuration tools, modules, software, products, works, and other intellectual property and moral rights related thereto or created, used, or provided by Onlook for the purposes of this Agreement, including any content or trademarks text, graphics, user and visual interfaces, photographs, logos, sounds, music, artwork, applications, computer code and associated documentation, the design, structure, arrangement, and "look and feel" of such content, and any improvements, updates, enhancements, copies and derivative works of the foregoing. Any software, tools and other materials distributed or otherwise provided to User (including without limitation any software identified in the Registration) will be deemed a part of the "Services" and subject to all of the terms and conditions of this Agreement. No rights or licenses are granted to User except as expressly and unambiguously set forth in this Agreement. User may (but is not obligated to) provide suggestions, comments or other feedback to Onlook with respect to the Service ("Feedback"). User agrees that Onlook will be free to use the Feedback for any purpose without any further accounting to User.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">4. Restrictions</h2>
                        <p className="text-foreground-secondary mb-6">
                            User agrees that it will not, directly or indirectly: (i) reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code, object code, or underlying structure, ideas, or algorithms of the Service (except to the extent applicable laws specifically prohibit such restriction); (ii) modify, translate, or create derivative works based on the Service; (iii) copy, rent, lease, distribute, pledge, assign, or otherwise transfer or encumber rights to the Service; (iv) use the Service for the benefit of a third party; (v) remove or otherwise alter any proprietary notices or labels from the Service or any portion thereof; (vi) use the Service to build an application or product that is competitive with any Onlook product or service; (vii) interfere or attempt to interfere with the proper working of the Service or any activities conducted on the Service; (viii) bypass any measures Onlook may use to prevent or restrict access to the Service (or other accounts, computer systems or networks connected to the Service).
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">5. User Data</h2>
                        <p className="text-foreground-secondary mb-6">
                            a. "User Data" means any data or information provided, uploaded, or submitted by User to the Service. User retains all right, title and interest in and to the User Data, including all intellectual property rights therein. User represents and warrants that it has all rights necessary to provide the User Data to Onlook as contemplated hereunder, in each case without any infringement, violation or misappropriation of any third-party rights (including, without limitation, intellectual property rights and rights of privacy).
                        </p>
                        <p className="text-foreground-secondary mb-6">
                            b. Except for contact and payment information provided for the purpose of registering for the Service, User agrees that Onlook does not wish to receive or agree to receive any personal information, financial information, protected health information or any other sensitive information regarding User or User's customers, and User agrees not to upload or transmit to Onlook any such information without the prior written consent of Onlook.
                        </p>
                        <p className="text-foreground-secondary mb-6">
                            c. Onlook will use and modify User Data only for the purpose of providing, maintaining and improving the Services and User hereby grants Onlook all licenses necessary to do so. In addition, unless User opts out using the user settings prior to providing the User Data to Onlook, Onlook may also use the User Data for the development and commercialization of models, algorithms, tools and related artificial intelligence products, which development activities may include, without limitation, training artificial intelligence models.
                        </p>
                        <p className="text-foreground-secondary mb-6">
                            d. In the course of providing the Service, Onlook may also collect statistical data and performance information, analytics, meta-data or similar information, generated through instrumentation and logging systems, regarding the operation of the Service, including User's use of the Service (the "Platform Data"). Onlook may use the Platform Data for any internal business purpose (including without limitation, for purposes of improving, testing, artificial intelligence model training, operating, promoting and marketing Onlook's products and services), provided however, that (i) Platform Data will not include any User Data, and (ii) Onlook will not disclose Platform Data to any third party in a manner that allows such third party to identify User.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">6. Communications</h2>
                        <p className="text-foreground-secondary mb-6">
                            You agree that Onlook may send you emails concerning our products and services, as well as those of third parties. You may opt out of promotional emails by responding to the promotional email itself or emailing us at contact@onlook.com.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">7. Suspension; Termination</h2>
                        <p className="text-foreground-secondary mb-6">
                            User agrees that Onlook may terminate or suspend User's access to the Services at any time in its sole discretion if it suspects that User is in breach of this Agreement.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">8. Indemnification</h2>
                        <p className="text-foreground-secondary mb-6">
                            User agrees to defend, indemnify, and hold harmless Onlook, its affiliates and each of its and its affiliates' employees, contractors, directors, suppliers and representatives from all liabilities, claims, and expenses paid or payable to an unaffiliated third party (including reasonable attorneys' fees), that arise from or relate to any claim (i) that the User Data or any Configuration infringes, violates, or misappropriates any third party intellectual property or proprietary right or (ii) based on User's breach of this Agreement.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">9. Disclaimer</h2>
                        <p className="text-foreground-secondary mb-6">
                            EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE SERVICES (INCLUDING ANY CONFIGURATIONS) ARE PROVIDED "AS IS" AND "AS AVAILABLE" AND ARE WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE, AND ANY WARRANTIES IMPLIED BY ANY COURSE OF PERFORMANCE, USAGE OF TRADE, OR COURSE OF DEALING, ALL OF WHICH ARE EXPRESSLY DISCLAIMED.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">10. Limitation of Liability</h2>
                        <p className="text-foreground-secondary mb-6">
                            IN NO EVENT SHALL ONLOOK, OR ITS DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS OR CONTENT PROVIDERS, BE LIABLE UNDER CONTRACT, TORT, STRICT LIABILITY, NEGLIGENCE OR ANY OTHER LEGAL OR EQUITABLE THEORY WITH RESPECT TO THE SUBJECT MATTER OF THIS AGREEMENT (I) FOR ANY LOST PROFITS, DATA LOSS, COST OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, OR SPECIAL, INDIRECT, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES OF ANY KIND WHATSOEVER, SUBSTITUTE GOODS OR SERVICES (HOWEVER ARISING), (II) FOR ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE (REGARDLESS OF THE SOURCE OF ORIGINATION), OR (III) FOR ANY DIRECT DAMAGES IN EXCESS OF (IN THE AGGREGATE) THE FEES PAID (OR PAYABLE) BY USER TO ONLOOK HEREUNDER IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO A CLAIM HEREUNDER.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">11. Changes</h2>
                        <p className="text-foreground-secondary mb-6">
                            Onlook may, from time to time, change this Agreement. Please check this Agreement periodically for changes. If Onlook makes any material modifications, Onlook will notify User. All modifications will be effective when they are posted, and User's continued access or use of the Service will serve as confirmation of User's acceptance of those modifications. If User does not agree to the modified Agreement, then User should immediately discontinue its use of the Services.
                        </p>

                        <h2 className="text-2xl font-light text-foreground-primary mt-12 mb-6">12. Miscellaneous</h2>
                        <p className="text-foreground-secondary mb-6">
                            This Agreement (including the Registration) represents the entire agreement between User and Onlook with respect to the subject matter hereof, and supersedes all prior or contemporaneous communications and proposals (whether oral, written or electronic) between User and Onlook with respect thereto. In the event of any conflict between these Terms and the Registration, the Registration shall control. The Agreement shall be governed by and construed in accordance with the laws of the State of New York, excluding its conflicts of law rules, and the parties consent to exclusive jurisdiction and venue in the state and federal courts located in New York, NY. All notices under this Agreement shall be in writing and shall be deemed to have been duly given when received, if personally delivered or sent by certified or registered mail, return receipt requested; when receipt is electronically confirmed, if transmitted by facsimile or e-mail; or the day after it is sent, if sent for next day delivery by recognized overnight delivery service. Notices must be sent to the contacts for each party set forth in the Registration. Either party may update its address set forth above by giving notice in accordance with this section. Neither party may assign any of its rights or obligations hereunder without the other party's consent; provided that either party may assign all of its rights and obligations hereunder without such consent to a successor-in-interest in connection with a sale of substantially all of such party's business relating to this Agreement. No agency, partnership, joint venture, or employment relationship is created as a result of this Agreement and neither party has any authority of any kind to bind the other in any respect. In any action or proceeding to enforce rights under this Agreement, the prevailing party shall be entitled to recover costs and attorneys' fees. If any provision of this Agreement is held to be unenforceable for any reason, such provision shall be reformed only to the extent necessary to make it enforceable. The failure of either party to act with respect to a breach of this Agreement by the other party shall not constitute a waiver and shall not limit such party's rights with respect to such breach or any subsequent breaches.
                        </p>
                    </div>
                </div>
            </main>
        </WebsiteLayout>
    );
}  