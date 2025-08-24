export interface HeroContent {
  subtitle: string;
  title: string;
  description: string;
  buttonText: string;
  buttonRoute: string;
}

export interface BenefitItem {
  subtitle: string;
  title: string;
  description: string;
  mockupComponent: string;
}

export interface FeatureItem {
  subtitle: string;
  title: string;
  description: string;
}

export interface IntroContent {
  subtitle: string;
  title: string;
}

export interface CTAContent {
  text: string;
  buttonText: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PageContent {
  hero: HeroContent;
  benefits: BenefitItem[];
  intro: IntroContent;
  features: FeatureItem[];
  cta: CTAContent;
  faqs: FAQItem[];
}
