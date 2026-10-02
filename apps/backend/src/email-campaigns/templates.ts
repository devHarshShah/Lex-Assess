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
    description: 'For students whose paid access has ended.',
    subject: 'We\'d love to have you back, {{firstName}}',
    preheader: 'Your LexAssess progress is still here.',
    suggestedStages: ['LAPSED'],
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
    key: 'registered-coupon',
    name: 'Registered: free days to get started',
    description: 'Welcome plus a coupon, for students who signed up but have not started a profile. Choose a coupon.',
    subject: '{{firstName}}, {{couponFreeDays}} free days to start with LexAssess',
    preheader: 'Set up your profile and use code {{couponCode}}.',
    suggestedStages: ['REGISTERED'],
    usesCoupon: true,
    bodyHtml: `<h2>Welcome, {{firstName}} — here's a head start</h2>
<p>You joined LexAssess but haven't set up your profile yet. To help you get going, here are <strong>{{couponFreeDays}} free days</strong> on us.</p>
<div class="coupon">{{couponCode}}</div>
<p>Set up your profile first (about 5 minutes), then enter the code when you subscribe. It is valid until {{couponExpiry}}.</p>
<p class="btn-row"><a class="btn" href="{{profileUrl}}">Set up my profile</a></p>`,
  },
  {
    key: 'profile-complete-coupon',
    name: 'Profile complete: free days to subscribe',
    description: 'Coupon nudge for students with a complete profile and no subscription. Choose a coupon.',
    subject: '{{firstName}}, your profile is ready — {{couponFreeDays}} free days inside',
    preheader: 'Use code {{couponCode}} when you subscribe.',
    suggestedStages: ['PROFILE_COMPLETE'],
    usesCoupon: true,
    bodyHtml: `<h2>You've done the hard part</h2>
<p>Hi {{firstName}}, your profile is complete. Subscribe now and your first <strong>{{couponFreeDays}} days are free</strong> with this code:</p>
<div class="coupon">{{couponCode}}</div>
<p>Valid until {{couponExpiry}}. You can cancel any time before your free period ends.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Start my free days</a></p>`,
  },
  {
    key: 'complete-payment-coupon',
    name: 'Payment not finished: free days to come back',
    description: 'For students who abandoned checkout, with a coupon to bring them back. Choose a coupon.',
    subject: '{{firstName}}, finish subscribing and get {{couponFreeDays}} days free',
    preheader: 'Your checkout is waiting. Use code {{couponCode}}.',
    suggestedStages: ['PAYMENT_INITIATED'],
    usesCoupon: true,
    bodyHtml: `<h2>Come back and finish — it's on us</h2>
<p>Hi {{firstName}}, you started subscribing to LexAssess but didn't finish. To make it easier, use this code for <strong>{{couponFreeDays}} days free</strong>:</p>
<div class="coupon">{{couponCode}}</div>
<p>Enter it at checkout. It is valid until {{couponExpiry}}.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Complete my subscription</a></p>
<p>Ran into a payment problem? Let us know and we'll sort it out.</p>`,
  },
  {
    key: 'access-ending',
    name: 'Access ending: autopay cancelled',
    description: 'For students who cancelled autopay but still have access until the paid period ends.',
    subject: '{{firstName}}, your LexAssess access ends on {{accessEndsAt}}',
    preheader: 'You still have access until then — make the most of it.',
    suggestedStages: ['CANCELLED_ACTIVE'],
    usesCoupon: false,
    bodyHtml: `<h2>Your access ends on {{accessEndsAt}}</h2>
<p>Hi {{firstName}}, you cancelled autopay, so your LexAssess access will end on <strong>{{accessEndsAt}}</strong>. Until then everything still works — including your assessment and your place on the rank list.</p>
<p>If you cancelled by mistake, or want to keep your access, you can subscribe again before it ends.</p>
<p class="btn-row"><a class="btn" href="{{dashboardUrl}}">Go to my dashboard</a></p>`,
  },
  {
    key: 'win-back-coupon',
    name: 'Win-back with free days',
    description: 'Offers a coupon to students whose paid access has ended. Choose a coupon.',
    subject: '{{firstName}}, come back to LexAssess — {{couponFreeDays}} days free',
    preheader: 'Your place can be restored. Use code {{couponCode}}.',
    suggestedStages: ['LAPSED'],
    usesCoupon: true,
    bodyHtml: `<h2>We'd love to have you back</h2>
<p>Hi {{firstName}}, your LexAssess subscription is no longer active, but your profile and past work are still saved. Resubscribe and your first <strong>{{couponFreeDays}} days are free</strong>:</p>
<div class="coupon">{{couponCode}}</div>
<p>Valid until {{couponExpiry}}.</p>
<p class="btn-row"><a class="btn" href="{{subscribeUrl}}">Resubscribe</a></p>`,
  },
  {
    key: 'paid-thank-you',
    name: 'Thank you & get the most out of it',
    description: 'For active, paying students: a thank-you and a nudge to use the platform.',
    subject: 'Thanks for being part of LexAssess, {{firstName}}',
    preheader: 'A few ways to get the most from your subscription.',
    suggestedStages: ['PAID'],
    usesCoupon: false,
    bodyHtml: `<h2>Thank you, {{firstName}}</h2>
<p>We're glad to have you on LexAssess. A quick reminder of how to get the most from your subscription:</p>
<ul>
<li>Take your practice-area assessment if you haven't yet</li>
<li>Complete your interview with a legal professional</li>
<li>Keep your profile up to date — it's what companies see</li>
</ul>
<p class="btn-row"><a class="btn" href="{{dashboardUrl}}">Open my dashboard</a></p>`,
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
