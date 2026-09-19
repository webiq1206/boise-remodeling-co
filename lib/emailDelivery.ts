/** Validate a single sender mailbox and require actual provider acceptance. */
export function mailboxAddress(value: string): string {
  if (typeof value !== "string" || /[\r\n]/.test(value)) throw new Error("Invalid email sender");
  const trimmed = value.trim();
  const named = trimmed.match(/^[^<>@]*<([^<>]+)>$/);
  const address = (named ? named[1] : trimmed).trim().toLowerCase();
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+$/.test(address)) throw new Error("Expected one sender mailbox");
  const domain = address.split("@")[1];
  if (!domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new Error("Invalid sender domain");
  }
  return address;
}

export function assertSenderDomain(from: string, domain: string): void {
  const senderDomain = mailboxAddress(from).split("@")[1];
  if (senderDomain !== domain && !senderDomain.endsWith("." + domain)) {
    throw new Error("Email sender must use " + domain + " or its verified subdomain");
  }
}

export function assertEmailAccepted(result: unknown): void {
  const response = result as { error?: unknown; skipped?: boolean; data?: { id?: unknown }; id?: unknown } | null;
  const id = response?.data?.id ?? response?.id;
  if (!response || response.error || response.skipped || typeof id !== "string" ||
      !id.trim() || id.trim().toLowerCase() === "noop") {
    throw new Error("Email provider did not accept the message");
  }
}

export function checkedEmailSender<Args extends [{ from?: string }, ...unknown[]], Result>(
  send: (...args: Args) => Promise<Result>, domain: string,
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    assertSenderDomain(args[0].from ?? "", domain);
    const result = await send(...args);
    assertEmailAccepted(result);
    return result;
  };
}
