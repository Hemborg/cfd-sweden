import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Text,
  render,
} from "react-email";
import { createElement } from "react";
import type { MailTemplate } from "./types";

type Rendered = {
  subject: string;
  text: string;
  html: string;
  marketing: boolean;
};
type Transactional = {
  subject: string;
  intro: string;
  detail?: string;
  action?: { label: string; url: string };
};

const bodyStyle = {
  backgroundColor: "#f6f7f9",
  color: "#16202a",
  fontFamily: "Arial, sans-serif",
  padding: "24px",
};
const cardStyle = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
};
const buttonStyle = {
  backgroundColor: "#16202a",
  borderRadius: "4px",
  color: "#ffffff",
  padding: "12px 18px",
  textDecoration: "none",
};
const escapeHtml = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

async function transactional(message: Transactional): Promise<Rendered> {
  const document = createElement(
    Html,
    { lang: "sv" },
    createElement(Head),
    createElement(
      Body,
      { style: bodyStyle },
      createElement(
        Container,
        { style: cardStyle },
        createElement(Text, null, message.intro),
        message.detail ? createElement(Text, null, message.detail) : null,
        message.action
          ? createElement(
              Button,
              { href: message.action.url, style: buttonStyle },
              message.action.label,
            )
          : null,
        message.action
          ? createElement(
              Text,
              { style: { fontSize: "12px", wordBreak: "break-all" } },
              createElement(
                Link,
                { href: message.action.url },
                message.action.url,
              ),
            )
          : null,
      ),
    ),
  );
  const [html, text] = await Promise.all([
    render(document),
    render(document, { plainText: true }),
  ]);
  return { subject: message.subject, text, html, marketing: false };
}

/** Transactional templates use React Email. Campaign HTML is supplied only by
 * the administrator's reviewed draft/schedule flow, never public input. */
export async function renderMail(
  template: MailTemplate,
  value: Record<string, unknown>,
): Promise<Rendered> {
  switch (template) {
    case "newsletter-confirmation":
      return transactional({
        subject: "Bekräfta din prenumeration hos CfD Sweden",
        intro: "Bekräfta din frivilliga prenumeration.",
        action: { label: "Bekräfta prenumeration", url: String(value.url) },
      });
    case "newsletter-confirmed":
      return transactional({
        subject: "Din prenumeration är bekräftad",
        intro: "Du är nu prenumerant hos CfD Sweden.",
        action: { label: "Avregistrera", url: String(value.unsubscribeUrl) },
      });
    case "portal-invitation":
      return transactional({
        subject: "Inbjudan till CfD Swedens medlemsportal",
        intro: "Du har bjudits in till medlemsportalen.",
        action: { label: "Acceptera inbjudan", url: String(value.url) },
      });
    case "account-recovery":
      return transactional({
        subject: "Återställ lösenord för CfD Sweden",
        intro:
          "Du kan välja ett nytt lösenord via länken. Om du inte bad om detta kan du ignorera meddelandet.",
        action: { label: "Återställ lösenord", url: String(value.url) },
      });
    case "welcome":
      return transactional({
        subject: "Välkommen till CfD Sweden",
        intro: `Välkommen${value.name ? ` ${String(value.name)}` : ""}!`,
      });
    case "event-confirmation":
      return transactional({
        subject: `Bekräfta anmälan: ${String(value.eventTitle)}`,
        intro: `Bekräfta din anmälan till ${String(value.eventTitle)}.`,
        action: { label: "Bekräfta anmälan", url: String(value.url) },
      });
    case "contact-received":
      return transactional({
        subject: "Vi har tagit emot din förfrågan",
        intro: "Tack, vi har tagit emot din förfrågan.",
        detail: `Referens: ${String(value.reference)}`,
      });
    case "contact-owner-notification":
      return transactional({
        subject: "Ny kontaktförfrågan – CfD Sweden",
        intro: "Ett nytt kontaktärende har kommit in.",
        detail: `ID: ${String(value.submissionId)}`,
      });
    case "event-registration":
      return transactional({
        subject: `Anmälan: ${String(value.eventTitle)}`,
        intro: `Din anmälan till ${String(value.eventTitle)} är registrerad.`,
        detail: value.ticketCode
          ? `Biljettkod: ${String(value.ticketCode)}`
          : undefined,
        action: value.cancellationUrl
          ? { label: "Avboka anmälan", url: String(value.cancellationUrl) }
          : value.url
            ? { label: "Visa anmälan", url: String(value.url) }
            : undefined,
      });
    case "event-cancelled":
      return transactional({
        subject: `Avbokning: ${String(value.eventTitle)}`,
        intro: `Din anmälan till ${String(value.eventTitle)} är avbokad.`,
      });
    case "event-waitlist":
      return transactional({
        subject: `Väntelista: ${String(value.eventTitle)}`,
        intro: `Du står på väntelistan för ${String(value.eventTitle)}.`,
        action: value.url
          ? { label: "Visa anmälan", url: String(value.url) }
          : undefined,
      });
    case "event-practical-info":
      return transactional({
        subject: `Praktisk information: ${String(value.eventTitle)}`,
        intro: `Praktisk information inför ${String(value.eventTitle)}.`,
        detail: String(value.message),
        action: value.url
          ? { label: "Visa evenemanget", url: String(value.url) }
          : undefined,
      });
    case "group-invitation":
      return transactional({
        subject: `Inbjudan till ${String(value.groupName)}`,
        intro: `Du har bjudits in till ${String(value.groupName)}.`,
        action: { label: "Öppna gruppen", url: String(value.url) },
      });
    case "task-assignment":
      return transactional({
        subject: `Ny uppgift: ${String(value.taskTitle)}`,
        intro: `Du har fått uppgiften ${String(value.taskTitle)}.`,
        action: { label: "Öppna uppgiften", url: String(value.url) },
      });
    case "campaign-newsletter": {
      const unsubscribeUrl = String(value.unsubscribeUrl);
      const footer = `<hr><p style="font-size:12px">Du får detta eftersom du har bekräftat din prenumeration hos CfD Sweden. <a href="${escapeHtml(unsubscribeUrl)}">Avregistrera</a></p>`;
      return {
        subject: String(value.subject),
        text: `${String(value.text)}\n\nAvregistrera: ${unsubscribeUrl}`,
        html: `${String(value.html)}${footer}`,
        marketing: true,
      };
    }
  }
}
