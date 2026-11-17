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

/**
 * One team email per request (owner, 17 November 2026), through the real POST handlers.
 *
 * The p5 intake's "New lead" email is the team email. This site's own team email is the fallback:
 * it waits for the bridge's answer inside after() and goes to the shared inbox only when p5 did
 * not confirm. The visitor's response and the customer's email never wait on p5.
 *
 * Mail is captured, not sent: RESEND_API_KEY is a placeholder, so the Resend client the route
 * builds posts through the stubbed fetch below and nothing leaves the process. The p5 intake is
 * the same stub, answering with whatever `alert` each case sets.
 */
async function oneTeamEmailPerRequest() {
  for (const name of ['REPLIT_CONNECTORS_HOSTNAME', 'REPL_IDENTITY', 'WEB_REPL_RENEWAL', 'DATABASE_URL']) delete process.env[name];
  process.env.RESEND_API_KEY = 're_isolated_verifier';
  process.env.LEAD_ROUTE_ISOLATED_TEST = '1';
  process.env.LEAD_DASHBOARD_KEY = 'isolated-verifier';
  const priorSecret = process.env.SESSION_SECRET;
  if (!priorSecret || priorSecret.length < 16) process.env.SESSION_SECRET = 'isolated-verifier-session-secret-0123456789';
  // Let anything the earlier checks left running finish before fetch is replaced.
  await new Promise((resolve) => setTimeout(resolve, 100));

  const SHARED_INBOX = 'hello@boiseremodeling.co';
  const mail: { to: string[]; subject: string }[] = [];
  const intake: Record<string, unknown>[] = [];
  const logs: string[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  let p5Answer: () => Promise<Response> = async () => json({ ok: true });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    if (url.startsWith('https://api.resend.com/')) {
      mail.push({ to: ([] as string[]).concat(body.to), subject: String(body.subject) });
      return json({ id: `captured-${mail.length}` });
    }
    if (url.startsWith('https://p5homeco.com/')) {
      intake.push(body);
      return p5Answer();
    }
    return json({});
  }) as typeof fetch;
  const log = console.log, warn = console.warn, error = console.error, info = console.info;
  console.warn = console.error = () => {};
  console.info = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  const { installInquiryAcceptanceTestAdapter } = await import('../server/services/inquiryAcceptance');
  const uninstall = installInquiryAcceptanceTestAdapter();
  const { NextRequest } = await import('next/server');
  const { POST } = await import('../app/api/consultation/route');
  const { POST: POST_DETAILS } = await import('../app/api/consultation/details/route');

  const until = async (done: () => boolean, what: string) => {
    for (let waited = 0; waited < 4000 && !done(); waited += 5) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.ok(done(), what);
  };
  // A handler that waited on p5 would hang here while p5 is held; fail instead.
  const answered = async (handler: Promise<Response>, what: string) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(what)), 4000); });
    try { return await Promise.race([handler, late]); } finally { clearTimeout(timer); }
  };
  const post = async (fields: Record<string, string>) => {
    const form = new FormData();
    form.set('inquiryId', crypto.randomUUID());
    form.set('formStartedAt', String(Date.now() - 5000));
    form.set('website', '');
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    const response = await answered(POST(new NextRequest('http://127.0.0.1/api/consultation', { method: 'POST', body: form })), 'the visitor response waited on the p5 bridge');
    return { status: response.status, body: await response.json() };
  };
  const postJson = async (payload: Record<string, unknown>) => {
    const response = await answered(POST(new NextRequest('http://127.0.0.1/api/consultation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inquiryId: crypto.randomUUID(), formStartedAt: Date.now() - 5000, website: '', ...payload }),
    })), 'the visitor response waited on the p5 bridge');
    return { status: response.status, body: await response.json() };
  };
  const postDetails = async (payload: Record<string, unknown>) => {
    const response = await answered(POST_DETAILS(new NextRequest('http://127.0.0.1/api/consultation/details', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })), 'the step 2 response waited on the p5 bridge');
    return { status: response.status, body: await response.json() };
  };
  /** This site's team email for one visitor: to the shared inbox, with their name in the subject. */
  const teamMail = (name: string) => mail.filter((message) => message.to.includes(SHARED_INBOX) && message.subject.includes(name));
  const intakeFor = (name: string, kind: string) => intake.filter((body) => body.name === name && body.submission_kind === kind);
  const leftToP5 = (label: string) => logs.filter((line) => line.includes(`[${label}] Team email left to p5`)).length;
  /** p5 confirmed: wait for the fallback to decide, then show the site sent the shared inbox nothing. */
  const expectLeftToP5 = async (label: string, before: number, name: string, what: string) => {
    await until(() => leftToP5(label) > before, `${what}: the fallback never decided`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(teamMail(name), [], `${what}: p5 confirmed its email, so the site sends the shared inbox none`);
  };
  /** p5 did not confirm: exactly one team email from the site, as before. */
  const expectSiteTeamEmail = async (name: string, subject: RegExp, what: string) => {
    await until(() => teamMail(name).length > 0, `${what}: the site's team email was not sent`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(teamMail(name).length, 1, `${what}: one team email, not two`);
    assert.match(teamMail(name)[0].subject, subject, what);
  };

  try {
    // 1. p5 is slow (it waits for HubSpot and its mail server), then confirms. The visitor is
    // answered and the customer has their email while p5 has still not answered.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    p5Answer = async () => { await held; return json({ ok: true, accepted: true, alert: 'sent' }, 201); };
    let before = leftToP5('consultation');
    const slow = await post({ name: 'Hal Verifier', phone: '2085550150', email: 'hal@example.com', message: 'Kitchen remodel with an island', contactPreference: 'email' });
    assert.equal(slow.status, 200, JSON.stringify(slow.body));
    assert.equal(slow.body.accepted, true);
    assert.equal(slow.body.delivery, 'sent', 'the visitor is told about their own delivery, without waiting for the team email');
    assert.equal(typeof slow.body.requestId, 'string');
    assert.equal(intakeFor('Hal Verifier', 'initial').length, 1, 'the bridge is already on its way');
    assert.equal(intakeFor('Hal Verifier', 'initial')[0].team_alert, 'confirm');
    assert.deepEqual(intakeFor('Hal Verifier', 'initial')[0].team_notes, ['Lead dashboard: https://leads.boiseremodeling.co', `Website request id: ${slow.body.requestId}`]);
    assert.equal('team_internal_notes' in intakeFor('Hal Verifier', 'initial')[0], false, 'no planning range: no internal pricing notes');
    assert.equal('estimate' in intakeFor('Hal Verifier', 'initial')[0], false, 'no planning range: no estimate for QuickBooks');
    assert.deepEqual(mail.filter((message) => message.to.includes('hal@example.com')).length, 1, 'the customer email is sent before p5 answers');
    assert.deepEqual(teamMail('Hal Verifier'), [], 'the team email is undecided until p5 answers');
    release();
    await expectLeftToP5('consultation', before, 'Hal Verifier', 'a written request');
    assert.equal(mail.filter((message) => message.to.includes('hal@example.com')).length, 1, 'still one customer email');

    // 2. Anything short of a confirmation: the site's team email goes out exactly as before.
    const unconfirmed: [string, () => Promise<Response>][] = [
      ['failed', async () => json({ ok: true, alert: 'failed' })],
      ['none', async () => json({ ok: true, alert: 'none' })],
      ['an older p5 with no alert field', async () => json({ ok: true, accepted: true })],
      ['an HTTP error', async () => json({ alert: 'sent' }, 500)],
      ['a thrown fetch', async () => { throw new Error('network down'); }],
      ['a timeout', async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); }],
    ];
    for (let index = 0; index < unconfirmed.length; index += 1) {
      const [what, answer] = unconfirmed[index];
      const name = `Una Verifier${index}`;
      p5Answer = answer;
      const response = await post({ name, phone: `20855501${60 + index}`, email: '', message: 'Hall bathroom remodel', contactPreference: 'text' });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      await expectSiteTeamEmail(name, new RegExp(`^New consultation request: ${name}$`), what);
    }

    // 3. "Have us call you": the same rule, with its own subject.
    p5Answer = async () => json({ ok: true, alert: 'sent' });
    before = leftToP5('consultation');
    await post({ name: 'Cal Verifier', phone: '2085550170', callback: '1', contactPreference: 'call', bestTime: 'Morning' });
    assert.equal(intakeFor('Cal Verifier', 'initial')[0].request_kind, 'callback');
    await expectLeftToP5('consultation', before, 'Cal Verifier', 'a callback request');
    p5Answer = async () => json({ ok: true });
    await post({ name: 'Cam Verifier', phone: '2085550171', callback: '1', contactPreference: 'call', bestTime: 'Morning' });
    await expectSiteTeamEmail('Cam Verifier', /^Callback request: Cam Verifier · 2085550171$/, 'a callback request p5 did not confirm');
    assert.equal('team_internal_notes' in intakeFor('Cal Verifier', 'initial')[0], false, 'a callback has no planning range');
    assert.equal('estimate' in intakeFor('Cal Verifier', 'initial')[0], false, 'a callback sends no estimate');

    // 4. A request with a planning range attached. Confirmed: no site email, and the range, the
    // price of each trade and the county record ride to p5 as team notes instead. Our costs and
    // margins ride beside them in team_internal_notes, never in team_notes.
    const carried = { project: 'kitchen', finish: 'mid-range', sqft: 180, priceLow: 1, priceHigh: 2, roi: 0, confidence: 'Planning range' };
    const propertyProfile = { formattedAddress: '123 Main St, Boise, ID 83702', city: 'Boise', state: 'ID', zip: '83702', parcelId: 'R1234567890', zoning: 'R-1C', lotSizeSqFt: 8276, lotSizeAcres: 0.19, permittingAuthority: 'City of Boise' };
    p5Answer = async () => json({ ok: true, alert: 'sent' });
    before = leftToP5('consultation');
    const ranged = await postJson({ name: 'Ivy Verifier', phone: '2085550172', email: 'ivy@example.com', address: '123 Main St, Boise, ID 83702', zip: '83702', projectType: 'kitchen', message: 'New cabinets and an island', estimate: carried, propertyProfile });
    assert.equal(ranged.status, 200, JSON.stringify(ranged.body));
    await expectLeftToP5('consultation', before, 'Ivy Verifier', 'a request with a planning range');
    const notes = intakeFor('Ivy Verifier', 'initial')[0].team_notes as string[];
    assert.ok(Array.isArray(notes) && notes.length <= 40 && notes.every((line) => typeof line === 'string' && line.length <= 300 && /^[^:\n]{2,60}: \S/.test(line)), 'team notes are well formed');
    assert.equal(notes[0], 'Lead dashboard: https://leads.boiseremodeling.co');
    assert.match(notes[1], /^Website request id: isolated-\d+$/);
    assert.match(notes[2], /^Planning range shown to the visitor: \$[\d,]+ to \$[\d,]+ /);
    assert.doesNotMatch(notes[2], /\$1 to \$2 /, 'the range is the server\'s, never the client numbers');
    assert.ok(notes.some((line) => line === 'Pricing alerts: 1'), 'pricing alerts ride as a count, never by name');
    assert.ok(notes.filter((line) => /^Price by trade, [^:]+: \$[\d,]+( \(.+\))?$/.test(line)).length >= 8);
    // Costs and margins stay out of HubSpot, and the p5 team email is copied there: nothing in
    // the body the bridge posts names a cost, margin, markup, profit, contingency or overhead.
    // Outside team_internal_notes, that is: team_notes names none of it, alert kinds included.
    const { team_internal_notes: internalNotes, ...ivyRest } = intakeFor('Ivy Verifier', 'initial')[0] as { team_internal_notes: string[] } & Record<string, unknown>;
    assert.doesNotMatch(JSON.stringify(ivyRest), /cost|margin|mark-?up|profit|contingenc|overhead|recompute-mismatch/i);
    // Internal pricing in the one team email (owner, 17 November 2026): our cost, margin and the
    // alert wording ride in their own field. p5 then sends "Lead and pricing", which its inbox
    // sync does not copy into HubSpot. Totals and alert wording first, our cost by trade after.
    assert.ok(Array.isArray(internalNotes) && internalNotes.length <= 60 && internalNotes.every((line) => typeof line === 'string' && line.length <= 300 && /^[^:\n]{2,60}: \S/.test(line)), 'internal pricing notes are well formed');
    assert.match(internalNotes[0], /^Direct cost: \$[\d,]+$/);
    assert.match(internalNotes[1], /^Contingency: \$[\d,]+$/);
    assert.match(internalNotes[2], /^Total internal cost: \$[\d,]+$/);
    assert.match(internalNotes[3], /^Gross profit: \$[\d,]+$/);
    assert.match(internalNotes[4], /^Margin: [\d.]+% gross margin \([\d.]+% markup\)/);
    assert.match(internalNotes[5], /^Quoted range basis: [\d.]+x to [\d.]+x of \$[\d,]+$/);
    assert.equal(internalNotes[6], 'Pricing alerts: recompute-mismatch', 'the alert is named here and only counted in team_notes');
    const internalTrades = internalNotes.filter((line) => /^Trade, [^:]+: our cost \$[\d,]+, customer \$[\d,]+/.test(line));
    assert.ok(internalTrades.length >= 8);
    assert.equal(internalTrades.length, notes.filter((line) => line.startsWith('Price by trade, ')).length, 'one cost line for every priced trade');
    const usd = (line: string) => Number(line.match(/\$([\d,]+)/)![1].replace(/,/g, ''));
    assert.ok(Math.abs(usd(internalNotes[0]) + usd(internalNotes[1]) - usd(internalNotes[2])) <= 1, 'direct cost plus contingency is the total internal cost');
    for (const line of notes) assert.equal(internalNotes.includes(line), false, 'the two fields never share a line');
    // The planning range as figures (owner, 13 and 17 November 2026): p5 creates the QuickBooks
    // customer and an UNSENT estimate from `estimate`. The range the server recomputed, verified,
    // and one line per trade with the CUSTOMER amount, summing to the customer price to the cent.
    type SentEstimate = { kind: string; low: number; high: number; label: string; verified: boolean; base?: number; lines: { title: string; division: string; amount: number; quantity?: number; unit?: string; description?: string }[] };
    const sentEstimate = ivyRest.estimate as SentEstimate;
    assert.equal(sentEstimate.kind, 'planning-range');
    assert.equal(sentEstimate.verified, true, 'the server recomputed the range, so it is sent as verified');
    assert.equal(sentEstimate.label, 'Kitchen, Mid-Range finish, 180 sq ft');
    assert.equal('base' in sentEstimate, false, 'with lines, p5 totals the lines');
    const shown = notes[2].match(/\$([\d,]+) to \$([\d,]+)/)!.slice(1).map((figure) => Number(figure.replace(/,/g, '')));
    assert.deepEqual([sentEstimate.low, sentEstimate.high], shown, 'low and high are the range the visitor was shown');
    assert.ok(sentEstimate.low > 1000 && sentEstimate.high > sentEstimate.low, 'never the client numbers');
    const priceNotes = notes.filter((line) => line.startsWith('Price by trade, '));
    assert.equal(sentEstimate.lines.length, priceNotes.length, 'one line for every priced trade');
    assert.ok(sentEstimate.lines.length >= 8 && sentEstimate.lines.length <= 60);
    sentEstimate.lines.forEach((line, index) => {
      assert.ok(line.title && line.title === line.division, 'title and division are the trade');
      assert.ok(priceNotes[index].startsWith(`Price by trade, ${line.title}: $`), 'the same trades, in the same order, as the team notes');
      assert.ok(Number.isFinite(line.amount) && line.amount > 0 && Math.abs(line.amount * 100 - Math.round(line.amount * 100)) < 1e-6, 'a positive amount in whole cents');
      // The customer price of the trade: the dollar figure the team notes print for it, not our cost.
      assert.ok(Math.abs(line.amount - usd(priceNotes[index])) <= 0.51, `${line.title}: the customer amount`);
      const ourCost = usd(internalTrades[index]);
      assert.ok(internalTrades[index].startsWith(`Trade, ${line.title}: our cost $`) && line.amount > ourCost + 1, `${line.title}: never our cost`);
    });
    const estimateTotal = sentEstimate.lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100;
    assert.ok(estimateTotal >= sentEstimate.low && estimateTotal <= sentEstimate.high, 'the lines total a price inside the range');
    // The customer price is the total internal cost plus the gross profit, to the dollar the notes print.
    assert.ok(Math.abs(estimateTotal - (usd(internalNotes[2]) + usd(internalNotes[3]))) <= 1.01, 'the lines sum to the customer price the team email shows');
    assert.doesNotMatch(JSON.stringify(sentEstimate), /cost|margin|mark-?up|profit|contingenc|overhead|internal/i, 'customer amounts only');
    for (const index of [0, 1, 2, 3]) {
      assert.equal(sentEstimate.lines.some((line) => Math.round(line.amount) === usd(internalNotes[index])), false, `${internalNotes[index].split(':')[0]} is not a line of the estimate`);
    }
    assert.ok(notes.some((line) => line === 'County record: Parcel: R1234567890; Zoning: R-1C; Lot: 0.19 acres (8,276 sq ft)'));
    assert.ok(notes.some((line) => line === 'Permits: City of Boise'));
    assert.equal(mail.filter((message) => message.to.includes('ivy@example.com')).length, 1, 'the customer still gets their planning range');
    p5Answer = async () => json({ ok: true, alert: 'failed' });
    await postJson({ name: 'Ian Verifier', phone: '2085550173', email: 'ian@example.com', address: '125 Main St, Boise, ID 83702', zip: '83702', projectType: 'kitchen', message: 'New cabinets and an island', estimate: carried });
    await expectSiteTeamEmail('Ian Verifier', /^New lead: Ian Verifier · Kitchen · \$[\d,]+ to \$[\d,]+$/, 'a request with a planning range p5 did not confirm');
    assert.deepEqual((intakeFor('Ian Verifier', 'initial')[0].estimate as { low: number; high: number }).low, sentEstimate.low, 'the estimate is sent whatever p5 answers about its email');
    // A callback that carries a planning range (the consult dialog): internal pricing for the
    // team, but no estimate for QuickBooks.
    p5Answer = async () => json({ ok: true, alert: 'sent' });
    before = leftToP5('consultation');
    const rangedCallback = await postJson({ requestKind: 'short', name: 'Kay Verifier', phone: '2085550174', email: '', projectType: 'kitchen', message: 'CALLBACK REQUEST: call Kay Verifier at 2085550174. Best time: Any time.', contactPreference: 'call', callback: true, bestTime: 'Any time', estimate: carried });
    assert.equal(rangedCallback.status, 200, JSON.stringify(rangedCallback.body));
    await expectLeftToP5('consultation', before, 'Kay Verifier', 'a callback with a planning range');
    assert.equal(intakeFor('Kay Verifier', 'initial')[0].request_kind, 'callback');
    assert.equal('estimate' in intakeFor('Kay Verifier', 'initial')[0], false, 'a callback sends no estimate, even with a range');
    assert.ok(Array.isArray(intakeFor('Kay Verifier', 'initial')[0].team_internal_notes), 'its internal pricing still reaches the team');

    // 5. Step 2 "Details added": the same rule on the details post.
    const { requestId, detailsToken } = slow.body as { requestId: string; detailsToken: string };
    p5Answer = async () => json({ ok: true, alert: 'sent' });
    before = leftToP5('request-details');
    const added = await postDetails({ requestId, token: detailsToken, details: { timing: '1 to 3 months' } });
    assert.equal(added.status, 200, JSON.stringify(added.body));
    await until(() => leftToP5('request-details') > before, 'step 2: the fallback never decided');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(mail.filter((message) => message.subject.startsWith('Details added')), [], 'step 2: p5 confirmed, so no "Details added" email from the site');
    const detailsBody = intakeFor('Hal Verifier', 'details')[0];
    assert.equal(detailsBody.team_alert, 'confirm');
    assert.deepEqual(detailsBody.team_notes, ['Lead dashboard: https://leads.boiseremodeling.co', `Website request id: ${requestId}`]);
    assert.equal('team_internal_notes' in detailsBody, false, 'step 2 sends no internal pricing notes');
    assert.equal('estimate' in detailsBody, false, 'step 2 sends no estimate');
    // "none" is what p5 answers when the details arrive before it has filed the request.
    p5Answer = async () => json({ ok: true, alert: 'none' });
    const addedAgain = await postDetails({ requestId, token: detailsToken, details: { projectType: 'Kitchen remodel' } });
    assert.equal(addedAgain.status, 200, JSON.stringify(addedAgain.body));
    await expectSiteTeamEmail('Hal Verifier', /^Details added: Hal Verifier$/, 'step 2 details p5 did not confirm');
  } finally {
    uninstall();
    globalThis.fetch = realFetch;
    Object.assign(console, { log, warn, error, info });
    delete process.env.RESEND_API_KEY;
    delete process.env.LEAD_DASHBOARD_KEY;
    delete process.env.LEAD_ROUTE_ISOLATED_TEST;
    if (priorSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSecret;
  }
  console.log('One team email per request: p5 confirmation, site fallback and undelayed visitor response passed.');
}

async function main(){
  {const {POST}=await import('../app/api/estimate-lead/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/re10/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/estimate/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  {const {POST}=await import('../app/api/plans/analyze/route'); const response=await POST(); const body=await response.json(); assert.equal(response.status,410); assert.equal(body.nextStep,'/estimate'); assert.equal(body.priceable,false); assert.equal(body.estimate,undefined);}
  console.log('Retired estimator API contracts passed.');
  await consultationShortRequests();
  await oneTeamEmailPerRequest();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
