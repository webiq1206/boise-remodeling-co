import React from "react";
import { SITE_CONFIG, TEXT_REPLY_HOURS, textReplyLine, textReplySmsHref } from "@/shared/siteConfig";

type TextReplyTag = "p" | "span";

/** The confirmed text-reply sentence. The phone is the only link, so the existing sms click tracker sees it. */
export function TextReplyLine({
  as: Tag = "p",
  className,
}: {
  as?: TextReplyTag;
  className?: string;
}) {
  return (
    <Tag className={className} data-testid="text-reply-line">
      Prefer to text? Text{" "}
      <a href={textReplySmsHref()}>{SITE_CONFIG.phone}</a>
      . We reply in minutes during business hours ({TEXT_REPLY_HOURS}).
    </Tag>
  );
}

/** Renders an answer that already contains the plain sentence, with the phone as an sms link. */
export function TextReplyAnswer({ answer }: { answer: string }) {
  const line = textReplyLine();
  if (!answer.includes(line)) return <>{answer}</>;
  const [before, after] = answer.split(line);
  return (
    <>
      {before}
      <TextReplyLine as="span" />
      {after}
    </>
  );
}
