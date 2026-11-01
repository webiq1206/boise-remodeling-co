import assert from 'node:assert/strict';

/**
 * The short request and "Have us call you" (components/approved/HeroConversion), through the real
 * /api/consultation POST handler. Delivery is scrubbed: the inquiry store is the isolated test
 * adapter (no database row), email has no transport, and fetch is stubbed so the CRM forward and
 * the p5 intake bridge are captured instead of sent.
 */
async function consultationShortRequests() {
  for (const name of ['RESEND_API_KEY', 'REPLIT_CONNECTORS_HOSTNAME', 'REPL_IDENTITY', 'WEB_REPL_RENEWAL', 'DATABASE_URL']) delete process.env[name];
  process.env.LEAD_ROUTE_ISOLATED_TEST = '1';
  // A placeholder key so the CRM payload is built; the stubbed fetch below captures it.
  process.env.LEAD_DASHBOARD_KEY = 'isolated-verifier';
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const log = console.log, warn = console.warn, error = console.error, info = console.info;
  console.warn = console.error = console.info = () => {};
  const { installInquiryAcceptanceTestAdapter } = await import('../server/services/inquiryAcceptance');
  const uninstall = installInquiryAcceptanceTestAdapter();
  const { NextRequest } = await import('next/server');
  const { POST } = await import('../app/api/consultation/route');
  const post = async (fields: Record<string, string>) => {
    const form = new FormData();
    form.set('inquiryId', crypto.randomUUID());
    form.set('formStartedAt', String(Date.now() - 5000));
    form.set('website', '');
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    sent.length = 0;
    const response = await POST(new NextRequest('http://127.0.0.1/api/consultation', { method: 'POST', body: form }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { status: response.status, body: await response.json(), sent: [...sent] };
  };
  const crm = (calls: typeof sent) => calls.find((call) => call.url.includes('leads.boiseremodeling.co'))?.body ?? {};
  const intake = (calls: typeof sent) => calls.find((call) => call.url.includes('p5homeco.com'))?.body ?? {};
  try {
    // A written request with no email: accepted, the preferred contact rides the notes.
    const request = await post({ name: 'Ada Verifier', phone: '(208) 555-0142', email: '', message: 'Kitchen counters and a leaking sink', contactPreference: 'text' });
    assert.equal(request.status, 200, JSON.stringify(request.body));
    assert.equal(request.body.accepted, true);
    assert.match(String(crm(request.sent).finalNotes), /^Kitchen counters and a leaking sink\n\nPreferred contact: Text me$/);
    assert.equal(crm(request.sent).email, 'no-email+2085550142@boiseremodeling.co', 'the dashboard requires an email: placeholder, as for chat leads');
    assert.equal(intake(request.sent).email, undefined, 'p5 intake gets the phone, not a placeholder');
    assert.equal(intake(request.sent).phone, '(208) 555-0142');

    // "Have us call you": name and phone only, marked as a callback request everywhere.
    const callback = await post({ name: 'Ada Verifier', phone: '(208) 555-0142', callback: '1', contactPreference: 'call', bestTime: 'Morning' });
    assert.equal(callback.status, 200, JSON.stringify(callback.body));
    assert.equal(callback.body.accepted, true);
    assert.equal(callback.body.duplicate, false, 'a callback after a written request is its own request');
    assert.equal(crm(callback.sent).finalNotes, 'CALLBACK REQUEST: call Ada Verifier at (208) 555-0142. Best time: Morning.');
    assert.deepEqual(crm(callback.sent).projectTypes, ['Home repair or remodel']);
    assert.match(String(intake(callback.sent).summary), /CALLBACK REQUEST: call Ada Verifier/);

    // With an email the written request still carries it to every destination.
    const emailed = await post({ name: 'Bo Verifier', phone: '2085550143', email: 'bo@example.com', message: 'Bathroom tile and a new vanity', contactPreference: 'email' });
    assert.equal(emailed.status, 200, JSON.stringify(emailed.body));
    assert.equal(crm(emailed.sent).email, 'bo@example.com');
    assert.equal(intake(emailed.sent).email, 'bo@example.com');

    // What the form also refuses on screen is refused here too.
    assert.equal((await post({ name: 'Cy Verifier', phone: '2085550144', message: '' })).status, 400, 'a written request needs a description');
    assert.equal((await post({ name: 'Cy Verifier', phone: '2085550144', message: 'Deck repair please', contactPreference: 'email' })).status, 400, 'Email me needs an email');
    assert.equal((await post({ name: 'Cy Verifier', phone: '2085550144', message: 'Deck repair please', email: 'not-an-email' })).status, 400, 'a typed email must be valid');
    assert.equal((await post({ name: 'Cy Verifier', phone: '12', callback: '1' })).status, 400, 'a callback needs a phone number');
    assert.equal((await post({ name: '', phone: '2085550144', callback: '1' })).status, 400, 'a callback needs a name');

    // The full consultation form keeps its required email and address.
    const full = await POST(new NextRequest('http://127.0.0.1/api/consultation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inquiryId: crypto.randomUUID(), formStartedAt: Date.now() - 5000, name: 'Di Verifier', phone: '2085550145', email: '', address: '123 Main St, Boise', projectType: 'kitchen' }),
    }));
    assert.equal(full.status, 400, 'the full consultation form still requires an email');
  } finally {
    uninstall();
    globalThis.fetch = realFetch;
    Object.assign(console, { log, warn, error, info });
    delete process.env.LEAD_DASHBOARD_KEY;
    delete process.env.LEAD_ROUTE_ISOLATED_TEST;
  }
  console.log('Short request and callback request contracts passed.');
}

async function main(){
  {const {POST}=await import('../app/api/estimate-lead/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  console.log('Retired estimator API contracts passed.');
  await consultationShortRequests();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
