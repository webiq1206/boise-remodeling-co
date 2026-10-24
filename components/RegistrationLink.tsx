import { Fragment } from "react";

/** Exact public wording. No parenthetical. */
export const REGISTRATION_LINE = "Idaho Registered Contractor #8381215";

/**
 * The public search linked from the Idaho DOPL contractors page
 * (dopl.idaho.gov/con/), anchor text "Search for a Registration".
 */
export const DOPL_LICENSE_SEARCH = "https://edopl.idaho.gov/OnlineServices/?link=PubSearch";

const linkClass = "underline underline-offset-2";

export function RegistrationLink({ className = linkClass }: { className?: string }) {
  return (
    <a
      href={DOPL_LICENSE_SEARCH}
      target="_blank"
      rel="noopener"
      title="Search for a Registration on Idaho DOPL"
      className={className}
    >
      {REGISTRATION_LINE}
    </a>
  );
}

/** Turn the registration phrase into the DOPL link. Other words stay plain text. */
export function RegistrationText({ text }: { text: string }) {
  const parts = text.split(REGISTRATION_LINE);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <RegistrationLink /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}
