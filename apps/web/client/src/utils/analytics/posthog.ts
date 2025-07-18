import posthog from 'posthog-js';
import { client as serverPostHog } from './server';

export const MILESTONE_EVENTS = {
  CREATE_PROJECT: 'create_project_milestone',
  IMPORT_PROJECT: 'import_project_milestone', 
  START_APP: 'start_app_milestone',
  SEND_AI_MESSAGE: 'send_ai_message_milestone',
  PUBLISH_ONLOOK_DOMAIN: 'publish_onlook_domain_milestone',
  MAP_CUSTOM_DOMAIN: 'map_custom_domain_milestone',
} as const;

export const SUBSCRIPTION_EVENTS = {
  SUBSCRIPTION_ACTIVE: 'subscription_event',
} as const;

export type MilestoneEvent = typeof MILESTONE_EVENTS[keyof typeof MILESTONE_EVENTS];
export type SubscriptionEvent = typeof SUBSCRIPTION_EVENTS[keyof typeof SUBSCRIPTION_EVENTS];

interface MilestoneEventProperties {
  [key: string]: any;
}

interface SubscriptionEventProperties {
  subscription_active: boolean;
  [key: string]: any;
}

export function trackMilestoneEvent(
  event: MilestoneEvent, 
  properties: MilestoneEventProperties = {}
) {
  if (typeof window === 'undefined') return;
  
  try {
    posthog.capture(event, {
      $set_once: {
        [event]: true,
        [`${event}_timestamp`]: new Date().toISOString(),
        ...properties
      }
    });
  } catch (error) {
    console.error('Error tracking milestone event:', error);
  }
}

export function trackSubscriptionEvent(
  properties: SubscriptionEventProperties
) {
  if (typeof window === 'undefined') return;
  
  try {
    posthog.capture(SUBSCRIPTION_EVENTS.SUBSCRIPTION_ACTIVE, {
      $set: properties
    });
  } catch (error) {
    console.error('Error tracking subscription event:', error);
  }
}

export function trackMilestoneEventServer(
  userId: string,
  event: MilestoneEvent,
  properties: MilestoneEventProperties = {}
) {
  if (!serverPostHog) return;
  
  try {
    serverPostHog.capture({
      distinctId: userId,
      event,
      properties: {
        $set_once: {
          [event]: true,
          [`${event}_timestamp`]: new Date().toISOString(),
          ...properties
        }
      }
    });
  } catch (error) {
    console.error('Error tracking milestone event on server:', error);
  }
}

export function trackSubscriptionEventServer(
  userId: string,
  properties: SubscriptionEventProperties
) {
  if (!serverPostHog) return;
  
  try {
    serverPostHog.capture({
      distinctId: userId,
      event: SUBSCRIPTION_EVENTS.SUBSCRIPTION_ACTIVE,
      properties: {
        $set: properties
      }
    });
  } catch (error) {
    console.error('Error tracking subscription event on server:', error);
  }
}

export function sendAnalytics(event: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.error('Error sending analytics:', error);
  }
}
