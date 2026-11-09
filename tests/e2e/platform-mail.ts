import { expect, type APIRequestContext } from "@playwright/test";
export async function deliveredMessage(
  request: APIRequestContext,
  email: string,
  subject: string,
) {
  let found: { ID: string } | undefined;
  await expect
    .poll(
      async () => {
        const work = await request.post("/api/jobs/mail", {
          headers: { Authorization: `Bearer ${process.env.CfD_JOB_SECRET}` },
        });
        expect(work.ok()).toBeTruthy();
        const messages = (await fetch(
          "http://127.0.0.1:54324/api/v1/messages?limit=100",
        ).then((r) => r.json())) as {
          messages: {
            ID: string;
            Subject: string;
            To: { Address: string }[];
          }[];
        };
        found = messages.messages.find(
          (item) =>
            item.Subject.includes(subject) &&
            item.To.some((recipient) => recipient.Address === email),
        );
        return Boolean(found);
      },
      { timeout: 20_000, intervals: [200, 500, 1000] },
    )
    .toBeTruthy();
  return (await fetch(
    `http://127.0.0.1:54324/api/v1/message/${found!.ID}`,
  ).then((r) => r.json())) as { HTML: string; Text: string };
}
export function mailLink(
  message: { HTML: string; Text: string },
  path: string,
) {
  const links = message.Text.match(/https?:\/\/[^\s<>"\]]+/g) ?? [];
  const link = links.find((value) => new URL(value).pathname === path);
  if (!link || new URL(link).origin !== "http://127.0.0.1:3402")
    throw new Error("Expected local link from actual SMTP delivery.");
  return link;
}
