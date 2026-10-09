import test from "node:test";
import assert from "node:assert/strict";
import { htmlToPlainText, wrapEmailHtml } from "../server/services/emailLayout";

test("plain text excludes style and script contents while retaining message text", () => {
  const html = '<STYLE type="text/css">@media screen { .brand { color: red; } }</STYLE><p>QA &amp; review</p><script type="text/javascript">trackingSecret()</script><p>Keep your style choices.<br>Reference QA-123</p>';
  assert.equal(htmlToPlainText(html), ["QA & review", "", "Keep your style choices.", "Reference QA-123"].join("\n"));
  assert.match(html, /@media screen/);
});

test("the branded HTML template keeps its styling while its text alternative is readable", () => {
  const html = wrapEmailHtml({ title: "Callback requested", subtitle: "Synthetic QA", content: "<p>NO CALLBACK NEEDED</p><p>Reference QA-123</p>" });
  const text = htmlToPlainText(html);
  assert.match(html, /<style[\s>]/i);
  assert.match(text, /NO CALLBACK NEEDED/);
  assert.match(text, /Reference QA-123/);
  assert.doesNotMatch(text, /@media|font-family\s*:|background(?:-color)?\s*:/i);
});
