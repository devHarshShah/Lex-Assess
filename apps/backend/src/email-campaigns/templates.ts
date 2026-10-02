import type { FunnelStage } from '../analytics/analytics.types';

export interface BuiltInTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  suggestedStages: FunnelStage[];
  usesCoupon: boolean;
}

// Bodies only: the branded header and the unsubscribe footer are added when rendering.
export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: 'welcome-finish-profile',
    name: 'Welcome: set up your profile',
    description: 'For students who signed up but never started their profile.',
    subject: 'Welcome to LexAssess, {{firstName}} — let\'s set up your profile',
    preheader: 'It takes about 5 minutes and unlocks your assessment.',
    suggestedStages: ['REGISTERED'],
    usesCoupon: false,
    bodyHtml: `<h2>Welcome aboard, {{firstName}}!</h2>
<p>Thanks for joining LexAssess. Your account is ready, but your profile isn't set up yet — and that's the first step to being ranked and noticed by top law firms and companies.</p>
<div class="callout"><strong>What you get</strong><br>A practice-area assessment, an interview with a legal professional, a verified certificate and a place on the national rank list.</div>
<p>Setting up your profile takes about 5 minutes.</p>
<p class="btn-row"><a class="btn" href="{{profileUrl}}">Set up my profile</a></p>
<p>If you get stuck, our team is happy to help.</p>`,
  },
  {
    key: 'finish-profile',
    name: 'Nudge: finish your profile',
    description: 'For students who started their profile but did not complete it.',
    subject: '{{firstName}}, you\'re one step away from completing your profile',
    preheader: 'Pick up right where you left off.',
    suggestedStages: ['PROFILE_STARTED'],
    usesCoupon: false,
    bodyHtml: `<h2>You're almost there</h2>
<p>Hi {{firstName}}, you started setting up your LexAssess profile but didn't finish. Your progress is saved — it only takes a couple of minutes to complete.</p>
<p>A complete profile is required before you can take the assessment, so it's worth doing today.</p>
<p class="btn-row"><a class="btn" href="{{profileUrl}}">Finish my profile</a></p>`,
  },
  {
    key: 'unlock-assessment',
    name: 'Unlock your assessment',
    description: 'For students with a complete profile who have not subscribed yet.',
    subject: '{{firstName}}, your profile is ready — unlock your assessment',
    preheader: 'You\'ve done the hard part. Get started with the assessment.',
    suggestedStages: ['PROFILE_COMPLETE'],
    usesCoupon: false,
    bodyHtml: `<h2>Your profile is ready</h2>
<p>Hi {{firstName}}, great work completing your profile. The next step is to subscribe and take your practice-area assessment.</p>
<ul>
<li>Take a timed assessment in your chosen practice area</li>
<li>Get interviewed by a legal professional</li>
<li>Earn a certificate and a spot on the rank list companies see</li>
</ul>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Unlock my assessment</a></p>`,
  },
  {
    key: 'complete-payment',
    name: 'Complete your payment',
    description: 'For students who opened checkout but never finished paying.',
    subject: '{{firstName}}, you left something behind',
    preheader: 'Your LexAssess subscription is waiting — finish in under a minute.',
    suggestedStages: ['PAYMENT_INITIATED'],
    usesCoupon: false,
    bodyHtml: `<h2>You were so close</h2>
<p>Hi {{firstName}}, we noticed you started subscribing to LexAssess but didn't complete the payment. If something went wrong, or you had a question, we'd love to help.</p>
<p>You can pick up where you left off — it only takes a minute.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Complete my subscription</a></p>
<p>Ran into a payment problem? Let us know and we'll sort it out.</p>`,
  },
  {
    key: 'coupon-offer',
    name: 'Coupon offer',
    description: 'Gives students a coupon code. Choose a coupon on the next step.',
    subject: '{{firstName}}, here\'s {{couponFreeDays}} days of LexAssess on us',
    preheader: 'Use code {{couponCode}} at checkout.',
    suggestedStages: ['REGISTERED', 'PROFILE_STARTED', 'PROFILE_COMPLETE', 'PAYMENT_INITIATED'],
    usesCoupon: true,
    bodyHtml: `<h2>A little gift for you</h2>
<p>Hi {{firstName}}, we'd like you to try LexAssess with <strong>{{couponFreeDays}} days free</strong>. Enter this code at checkout:</p>
<div class="coupon">{{couponCode}}</div>
<p>The offer is valid until {{couponExpiry}}. You can cancel any time before your free period ends.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Claim my free days</a></p>`,
  },
  {
    key: 'win-back',
    name: 'Win-back: we miss you',
    description: 'For students who cancelled or whose access ended.',
    subject: 'We\'d love to have you back, {{firstName}}',
    preheader: 'Your LexAssess progress is still here.',
    suggestedStages: ['CANCELLED_ACTIVE', 'LAPSED'],
    usesCoupon: false,
    bodyHtml: `<h2>Come back to LexAssess</h2>
<p>Hi {{firstName}}, we noticed your subscription is no longer active. Your profile and past work are still saved, and your place can be restored the moment you resubscribe.</p>
<p>If something didn't work for you, we'd love to hear about it.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Resubscribe</a></p>`,
  },
  {
    key: 'trial-ending',
    name: 'Trial ending soon',
    description: 'For students currently in a free trial.',
    subject: '{{firstName}}, your free trial ends on {{trialEndsAt}}',
    preheader: 'Make the most of the days you have left.',
    suggestedStages: ['TRIAL'],
    usesCoupon: false,
    bodyHtml: `<h2>Your free trial ends on {{trialEndsAt}}</h2>
<p>Hi {{firstName}}, your free period is coming to an end. There's still time to take your assessment and get on the rank list.</p>
<p class="btn-row"><a class="btn" href="{{dashboardUrl}}">Go to my dashboard</a></p>`,
  },
  {
    key: 'announcement',
    name: 'General announcement',
    description: 'A clean starting point for any update. Edit the text to suit.',
    subject: 'News from LexAssess',
    preheader: 'An update for you.',
    suggestedStages: [],
    usesCoupon: false,
    bodyHtml: `<h2>Hi {{firstName}},</h2>
<p>Write your announcement here. Use short paragraphs and one clear call to action.</p>
<p class="btn-row"><a class="btn" href="{{dashboardUrl}}">Open LexAssess</a></p>`,
  },
];
