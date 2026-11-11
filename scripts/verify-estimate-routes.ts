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
  // Quote form v2 signs the step 2 token with SESSION_SECRET; a local run may not have one.
  const priorSecret = process.env.SESSION_SECRET;
  if (!priorSecret || priorSecret.length < 16) process.env.SESSION_SECRET = 'isolated-verifier-session-secret-0123456789';
  const { rm } = await import('node:fs/promises');
  const path = await import('node:path');
  // Isolated request ids restart at isolated-1 each run; files from an earlier run must not count.
  const clearIsolatedUploads = async () => {
    for (let n = 1; n <= 40; n += 1) await rm(path.join(process.cwd(), '.uploads', 'requests', `isolated-${n}`), { recursive: true, force: true });
  };
  await clearIsolatedUploads();
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof init?.body === 'string') sent.push({ url: String(input), body: JSON.parse(init.body) });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const log = console.log, warn = console.warn, error = console.error, info = console.info;
  console.warn = console.error = console.info = () => {};
  const { installInquiryAcceptanceTestAdapter } = await import('../server/services/inquiryAcceptance');
  const uninstall = installInquiryAcceptanceTestAdapter();
  const { NextRequest } = await import('next/server');
  const { POST } = await import('../app/api/consultation/route');
  const { POST: POST_FILE } = await import('../app/api/consultation/files/route');
  const { POST: POST_DETAILS } = await import('../app/api/consultation/details/route');
  const { issueRequestDetailsToken } = await import('../server/services/requestDetailsToken');
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
    // Quote form v2: the p5 intake contract, and the follow-up key for files and step 2.
    assert.equal(intake(request.sent).request_kind, 'quote');
    assert.equal(intake(request.sent).contact_preference, 'text');
    assert.equal(intake(request.sent).submission_kind, 'initial');
    assert.equal(intake(request.sent).external_id, intake(request.sent).externalLeadId);
    assert.equal(intake(request.sent).projectType, 'Not sure', 'a short request is "Not sure" on p5 until step 2 names it');
    assert.equal(crm(request.sent).preferredContactMethod, 'text');
    assert.equal(typeof request.body.requestId, 'string');
    assert.equal(typeof request.body.detailsToken, 'string');

    // "Have us call you": name and phone only, marked as a callback request everywhere.
    const callback = await post({ name: 'Ada Verifier', phone: '(208) 555-0142', callback: '1', contactPreference: 'call', bestTime: 'Morning' });
    assert.equal(callback.status, 200, JSON.stringify(callback.body));
    assert.equal(callback.body.accepted, true);
    assert.equal(callback.body.duplicate, false, 'a callback after a written request is its own request');
    assert.equal(crm(callback.sent).finalNotes, 'CALLBACK REQUEST: call Ada Verifier at (208) 555-0142. Best time: Morning.');
    assert.deepEqual(crm(callback.sent).projectTypes, ['Home repair or remodel']);
    assert.match(String(intake(callback.sent).summary), /CALLBACK REQUEST: call Ada Verifier/);
    assert.equal(intake(callback.sent).request_kind, 'callback');
    assert.equal(intake(callback.sent).best_time, 'Morning');
    assert.equal(intake(callback.sent).contact_preference, 'call');

    // Step 1's optional project address (owner, 11 November 2026) is plain text on the same
    // address field step 2 uses: it reaches the stored lead, the CRM forward and p5 intake.
    // No address sends the same blank as before, and a callback carries none.
    const addressed = await post({ name: 'Gus Verifier', phone: '2085550148', email: '', address: ' 456 Oak Ave, Boise, ID 83702 ', message: 'Hall bathroom remodel', contactPreference: 'text' });
    assert.equal(addressed.status, 200, JSON.stringify(addressed.body));
    assert.equal(crm(addressed.sent).propertyAddress, '456 Oak Ave, Boise, ID 83702');
    assert.equal(intake(addressed.sent).address, '456 Oak Ave, Boise, ID 83702');
    const { loadAcceptedRequest: loadAddressed } = await import('../server/services/inquiryAcceptance');
    const addressedRow = await loadAddressed(addressed.body.requestId);
    assert.deepEqual([addressedRow?.address, addressedRow?.zip], ['456 Oak Ave, Boise, ID 83702', '83702']);
    assert.equal(crm(request.sent).propertyAddress, undefined, 'no address: nothing is sent');
    const blankRow = await loadAddressed(request.body.requestId);
    assert.equal(blankRow?.address, '', 'no address: the same blank as before');
    const callbackAddressed = await post({ name: 'Gus Verifier', phone: '2085550148', callback: '1', contactPreference: 'call', address: '456 Oak Ave, Boise, ID 83702' });
    assert.equal(crm(callbackAddressed.sent).propertyAddress, undefined, 'a callback is name and phone only');

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

    // Quote form v2: the lead first (with the names of the files on their way), then each file,
    // then step 2, all on the SAME stored lead.
    const withFiles = await post({ name: 'Eve Verifier', phone: '2085550146', email: '', message: 'Basement finish with a bathroom', contactPreference: 'call', pendingFiles: JSON.stringify(['basement.jpg', 'plans.pdf']) });
    assert.equal(withFiles.status, 200, JSON.stringify(withFiles.body));
    assert.match(String(crm(withFiles.sent).finalNotes), /Photos and files on the way \(2\): basement\.jpg, plans\.pdf\./);
    const { requestId, detailsToken } = withFiles.body as { requestId: string; detailsToken: string };
    const upload = async (fields: Record<string, string | Blob>, name?: string) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') form.set(key, value);
        else form.set(key, value, name);
      }
      const response = await POST_FILE(new NextRequest('http://127.0.0.1/api/consultation/files', { method: 'POST', body: form }));
      return { status: response.status, body: await response.json() };
    };
    const jpeg = new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1])], { type: 'image/jpeg' });
    const pdf = new Blob([new TextEncoder().encode('%PDF-1.4\n%verifier\n')], { type: 'application/pdf' });
    const photo = await upload({ requestId, token: detailsToken, file: jpeg }, 'basement.jpg');
    assert.equal(photo.status, 200, JSON.stringify(photo.body));
    const plan = await upload({ requestId, token: detailsToken, file: pdf }, 'plans.pdf');
    assert.equal(plan.status, 200, JSON.stringify(plan.body));
    assert.ok(String(photo.body.file.key).startsWith(`requests/${requestId}/`), 'files are stored under their request');
    const disguised = await upload({ requestId, token: detailsToken, file: new Blob(['<html>'], { type: 'image/jpeg' }) }, 'photo.jpg');
    assert.equal(disguised.status, 400, 'a file whose bytes are not the claimed type is refused');
    assert.equal((await upload({ requestId, token: 'forged.token', file: jpeg }, 'x.jpg')).status, 403, 'a forged token stores nothing');
    const otherToken = issueRequestDetailsToken('isolated-1');
    assert.equal((await upload({ requestId, token: otherToken!, file: jpeg }, 'x.jpg')).status, 403, "another request's token stores nothing");

    const details = async (payload: Record<string, unknown>) => {
      sent.length = 0;
      const response = await POST_DETAILS(new NextRequest('http://127.0.0.1/api/consultation/details', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { status: response.status, body: await response.json(), sent: [...sent] };
    };
    const attached = await details({ requestId, token: detailsToken, files: [photo.body.file.key, plan.body.file.key, 'requests/isolated-1/not-mine.jpg'] });
    assert.equal(attached.status, 200, JSON.stringify(attached.body));
    assert.deepEqual(attached.body.files, ['basement.jpg', 'plans.pdf'], "a key from another request is ignored");
    const filesIntake = intake(attached.sent);
    assert.equal(filesIntake.submission_kind, 'details');
    assert.equal(filesIntake.external_id, intake(withFiles.sent).external_id, 'the same external_id as step 1');
    assert.deepEqual((filesIntake.files as { name: string }[]).map((file) => file.name), ['basement.jpg', 'plans.pdf']);
    assert.match(String((filesIntake.files as { url: string }[])[0].url), /^https:\/\/boiseremodeling\.co\/api\/documents\/local\/requests%2F/);
    assert.match(String(crm(attached.sent).finalNotes), /DETAILS ADDED[\s\S]*basement\.jpg \(1 KB\): https:/);
    assert.equal(crm(attached.sent).source, 'boiseremodeling.co details');

    const step2 = await details({ requestId, token: detailsToken, details: { projectType: 'Basement finishing', address: '123 Main St, Boise, ID 83702', timing: '1 to 3 months' } });
    assert.equal(step2.status, 200, JSON.stringify(step2.body));
    assert.equal(intake(step2.sent).projectType, 'Basement finishing');
    assert.equal(intake(step2.sent).timeline, '1 to 3 months');
    assert.equal(intake(step2.sent).address, '123 Main St, Boise, ID 83702');
    assert.equal(crm(step2.sent).timeline, '1 to 3 months');
    assert.deepEqual(crm(step2.sent).projectTypes, ['Basement finishing'], 'the placeholder project type is replaced');
    const repeat = await details({ requestId, token: detailsToken, details: { projectType: 'Basement finishing', address: '123 Main St, Boise, ID 83702', timing: '1 to 3 months' } });
    assert.deepEqual([repeat.status, repeat.body.unchanged, repeat.sent.length], [200, true, 0], 'the same details twice: no second update anywhere');
    const { loadAcceptedRequest } = await import('../server/services/inquiryAcceptance');
    const row = await loadAcceptedRequest(requestId);
    assert.equal(row?.projectType, 'Basement finishing');
    assert.equal(row?.zip, '83702');
    assert.match(String(row?.message), /^Basement finish with a bathroom\n\nPreferred contact: Call me\n\nPhotos and files on the way \(2\)/, 'step 1 notes stay first');
    assert.equal(row?.message.match(/DETAILS ADDED/g)?.length, 2);
    assert.equal((await details({ requestId, token: detailsToken, details: {} })).status, 400, 'nothing to add is refused, not stored');
    assert.equal((await details({ requestId, token: 'forged.token', details: { timing: 'Soon' } })).status, 403);
    const expired = (() => {
      const realNow = Date.now;
      Date.now = () => realNow() - 3 * 60 * 60 * 1000;
      try { return issueRequestDetailsToken(requestId)!; } finally { Date.now = realNow; }
    })();
    assert.equal((await details({ requestId, token: expired, details: { timing: 'Soon' } })).status, 410, 'an expired token is refused');
    assert.equal((await details({ requestId: 'isolated-999', token: issueRequestDetailsToken('isolated-999'), details: { timing: 'Soon' } })).status, 404, 'an unknown request is refused');

    // The consult dialog (owner, 11 November 2026) is the short request too. With a carried
    // planning range it posts JSON as requestKind "short": no email, no address, the notes
    // built the way the multipart reader builds them, and the range recomputed server-side.
    const postJson = async (payload: Record<string, unknown>) => {
      sent.length = 0;
      const response = await POST(new NextRequest('http://127.0.0.1/api/consultation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestKind: 'short', inquiryId: crypto.randomUUID(), formStartedAt: Date.now() - 5000, website: '', ...payload }),
      }));
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { status: response.status, body: await response.json(), sent: [...sent] };
    };
    const carried = { project: 'kitchen', finish: 'mid-range', sqft: 180, priceLow: 1, priceHigh: 2, roi: 0, confidence: 'Planning range' };
    const dialog = await postJson({ name: 'Flo Verifier', phone: '2085550147', email: '', projectType: 'kitchen', message: 'New cabinets and an island\n\nPreferred contact: Text me', contactPreference: 'text', estimate: carried });
    assert.equal(dialog.status, 200, JSON.stringify(dialog.body));
    assert.equal(dialog.body.accepted, true);
    assert.equal(typeof dialog.body.requestId, 'string', 'step 2 is offered on the dialog request too');
    assert.equal(typeof dialog.body.detailsToken, 'string');
    assert.equal(crm(dialog.sent).finalNotes, 'New cabinets and an island\n\nPreferred contact: Text me');
    assert.equal(crm(dialog.sent).preferredContactMethod, 'text');
    assert.deepEqual(crm(dialog.sent).projectTypes, ['kitchen'], 'the carried range names the project');
    assert.equal(crm(dialog.sent).email, 'no-email+2085550147@boiseremodeling.co', 'email stays optional on the dialog request');
    const carriedEstimate = crm(dialog.sent).estimate as { projectType: string; sizeSqft: number; priceLow: number; priceHigh: number };
    assert.deepEqual([carriedEstimate.projectType, carriedEstimate.sizeSqft], ['kitchen', 180]);
    assert.ok(carriedEstimate.priceLow > 1000 && carriedEstimate.priceHigh > carriedEstimate.priceLow, 'the range is recomputed server-side, never the client numbers');
    assert.equal(intake(dialog.sent).request_kind, 'quote');
    const dialogCallback = await postJson({ name: 'Flo Verifier', phone: '2085550147', email: '', projectType: 'kitchen', message: 'CALLBACK REQUEST: call Flo Verifier at 2085550147. Best time: Any time.', contactPreference: 'call', callback: true, bestTime: 'Any time', estimate: carried });
    assert.equal(dialogCallback.status, 200, JSON.stringify(dialogCallback.body));
    assert.equal(intake(dialogCallback.sent).request_kind, 'callback');
    assert.equal((await postJson({ name: 'Flo Verifier', phone: '2085550147', projectType: 'kitchen', message: 'short', estimate: carried })).status, 400, 'a written dialog request still needs a description');

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
    if (priorSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSecret;
    await clearIsolatedUploads();
  }
  console.log('Short request, callback request, file upload and step 2 details contracts passed.');
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
