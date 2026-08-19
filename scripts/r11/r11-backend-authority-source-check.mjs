import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const google = read('src/modules/auth/google-auth.service.ts');
const otp = read('src/modules/auth/otp.service.ts');
const firebase = read('src/queue/firebase/firebase-messaging.service.ts');
const paymentFactory = read('src/modules/wallet/providers/payment-gateway.factory.ts');
const stripe = read('src/modules/wallet/providers/stripe.provider.ts');
const razorpay = read('src/modules/wallet/providers/razorpay.provider.ts');
const paypal = read('src/modules/wallet/providers/paypal.provider.ts');
const googlePlay = read('src/modules/wallet/providers/google-play.provider.ts');
const apple = read('src/modules/wallet/providers/apple-iap.provider.ts');
const rtcFactory = read('src/modules/rtc/providers/rtc-provider.factory.ts');
const rtcService = read('src/modules/rtc/rtc.service.ts');
const analytics = read('src/modules/analytics/room-analytics.service.ts');
const providerTest = read('src/modules/admin/provider-test-connection.service.ts');
const dashboard = read('src/modules/admin/admin-dashboard.service.ts');

const checks = [
  ['Google sign-in verifies Firebase ID token and has no unverified JWT payload fallback',
    /verifyIdToken\(idToken\)/.test(google) && !/decodeJwtPayload|Buffer\.from\([^)]*split\('\.'\)/.test(google)],
  ['OTP uses cryptographically secure generation and no universal 123456 bypass',
    /crypto\.randomInt\(100000, 1000000\)/.test(otp) && !/otpCode\s*===\s*['"]123456['"]|===\s*['"]123456['"]/.test(otp)],
  ['OTP audit persistence hashes OTP values', /bcrypt\.hash\(otpCode/.test(otp)],
  ['Firebase delivery fails closed instead of returning mock-success IDs',
    !/mock-message|mock-batch|mock success/i.test(firebase) && /success:\s*false/.test(firebase)],
  ['Unknown/MOCK payment providers fail closed instead of falling back to Google Play',
    /Unsupported or unavailable payment provider/.test(paymentFactory) && !/return this\.googlePlayProvider/.test(paymentFactory)],
  ['Stripe verification/refunds use Stripe API instead of mock acceptance',
    /api\.stripe\.com\/v1\/payment_intents/.test(stripe) && /api\.stripe\.com\/v1\/refunds/.test(stripe) && !/includes\(['"]FAIL['"]\)/.test(stripe)],
  ['Razorpay verification/refunds use Razorpay API instead of mock acceptance',
    /api\.razorpay\.com\/v1\/payments/.test(razorpay) && /\/refund/.test(razorpay) && !/includes\(['"]FAIL['"]\)/.test(razorpay)],
  ['PayPal verification/refunds use OAuth/API instead of mock acceptance',
    /v1\/oauth2\/token/.test(paypal) && /v2\/payments\/captures/.test(paypal) && !/PAYER123|includes\(['"]FAIL['"]\)/.test(paypal)],
  ['Unimplemented Google Play and Apple server adapters fail closed',
    /isValid:\s*false/.test(googlePlay) && /isValid:\s*false/.test(apple) && !/isValid:\s*true/.test(googlePlay) && !/isValid:\s*true/.test(apple)],
  ['RTC mock provider is explicitly development-gated and unknown providers fail closed',
    /ENABLE_RTC_MOCK_PROVIDER/.test(rtcFactory) && /Unsupported RTC provider/.test(rtcFactory) && !/return this\.agoraProvider/.test(rtcFactory)],
  ['RTC service rejects implicit mock creation/provider override in production paths',
    /RTC mock provider is disabled/.test(rtcService) && /ENABLE_RTC_PROVIDER_OVERRIDE/.test(rtcService)],
  ['Room/Creator analytics no longer generate random or hard-coded synthetic metrics',
    !/Math\.random\(|Superstar Rocket|co-host-uuid|1420|1240|8430|1850\.25|78\.4/.test(analytics)],
  ['Provider connection tests distinguish structural validation from real connectivity and reject unknown providers',
    /liveConnectivityVerified:\s*false/.test(providerTest) && /Unsupported payment provider/.test(providerTest) && /Unsupported RTC provider/.test(providerTest)],
  ['Admin dashboard no longer fabricates active-user, RTC quality/capacity or storage usage values',
    !/Math\.floor\(totalUsers \* 0\.4\)|capacityLimit:\s*500|averageQualityScore:\s*92\.4|usageMb:\s*1240/.test(dashboard)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) passed += 1;
}
console.log(`R11 Backend authority QA source check: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
