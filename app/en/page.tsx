import Image from "next/image";
import Link from "next/link";
import { ArrowIcon, Header } from "@/components/Header";
import { JoinForm } from "@/components/JoinForm";
import { EnSiteFooter } from "@/components/en/EnSiteFooter";
import { enNavigation, homeContentEn, pageContentEn } from "@/content/site.en";

const enHeaderContent = {
  join: pageContentEn.header.join,
  menu: pageContentEn.header.menu,
  joinHref: "/ga-med",
  homeHref: "/en",
};

const involvementDescriptions = [
  "Create space for factual conversations, screenings, and meetings where more people can participate.",
  "Contribute with source work, language skills, and context that makes information more accessible.",
  "Help conduct a constructive dialogue with media, politicians, and authorities.",
  "Find others who want to build a local network where you live.",
];

const involvementIcons = ["grassroots", "right-to-know", "policy", "whistleblower"];

export default function HomeEn() {
  return (
    <main>
      <Header current="home" nav={enNavigation} headerContent={enHeaderContent} />
      <section id="top" className="mother-hero">
        <div className="hero-backdrop" aria-hidden="true">
          <Image src="/images/cfd-hero.webp" alt="" fill priority sizes="100vw" />
        </div>
        <div className="hero-inner section-wrap">
          <p className="eyebrow">Part of New Paradigm Institute</p>
          <h1>Citizens for Disclosure</h1>
          <p className="hero-lead">A Swedish movement for responsible transparency on UAP and the UFO question.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/ga-med">Get involved <ArrowIcon /></Link>
            <Link className="button button-outline" href="/en/take-action">See how you can contribute</Link>
          </div>
        </div>
      </section>
      <section id="info" className="home-about">
        <div className="section-wrap home-about-grid">
          <div>
            <p className="eyebrow">About the movement</p>
            <h2>{homeContentEn.title}</h2>
            <p>{homeContentEn.lead}</p>
            <Link className="text-link" href="/en/about">Learn about CFD Sweden ↗</Link>
          </div>
          <a className="video-card" href={homeContentEn.video.href} target="_blank" rel="noreferrer" aria-label={homeContentEn.video.accessibleLabel}>
            <Image src="/images/cfd-film.jpg" alt="Still from the Citizens for Disclosure film" fill sizes="(max-width: 800px) 100vw, 48vw" />
            <span className="video-title">{homeContentEn.video.title}</span>
            <span className="play-button" aria-hidden="true">▶</span>
            <span className="video-caption">{homeContentEn.video.caption}</span>
          </a>
        </div>
      </section>
      <section className="home-involvement">
        <div className="section-wrap">
          <p className="eyebrow">Get involved</p>
          <h2>{homeContentEn.actionHeading}</h2>
          <div className="involvement-grid">
            {homeContentEn.actions.map((action, index) => (
              <article className="involvement-card" key={action}>
                <Image className="involvement-icon" src={`/icons/${involvementIcons[index]}.svg`} alt="" width={64} height={64} />
                <h3>{action}</h3>
                <p>{involvementDescriptions[index]}</p>
                <Link href="/ga-med">Sign up <ArrowIcon /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="home-why">
        <div className="section-wrap home-why-grid">
          <div>
            <p className="eyebrow">CFD Sweden</p>
            <h2>{homeContentEn.why.title}</h2>
            <p>{homeContentEn.why.text}</p>
            <Link className="text-link" href="/en/our-work">Read about our work ↗</Link>
          </div>
          <div className="home-why-image">
            <Image src="/images/cfd-volunteers.webp" alt="Participants in the international Citizens for Disclosure movement with banners and signs" fill sizes="(max-width: 800px) 100vw, 45vw" />
          </div>
        </div>
      </section>
      <section className="home-faq">
        <div className="section-wrap">
          <p className="eyebrow">Common questions</p>
          <h2>Curious about CFD Sweden?</h2>
          <div className="faq-list">
            <details>
              <summary>What is Citizens for Disclosure?</summary>
              <p>Citizens for Disclosure is New Paradigm Institute&apos;s grassroots network for responsible openness around UFOs and UAP. CFD Sweden brings together people who want to contribute in a Swedish context. <Link href="/en/about">Read more about us.</Link></p>
            </details>
            <details>
              <summary>How can I get involved?</summary>
              <p>You can help with research, translation, local conversations, and contacting media or elected officials. <Link href="/ga-med">Tell us how you want to contribute.</Link></p>
            </details>
            <details>
              <summary>Do I need to be an expert?</summary>
              <p>You don&apos;t need to be an expert to contribute. Start with what you&apos;re curious about and get involved to the extent that suits you. <Link href="/en/learn">Explore our resource library.</Link></p>
            </details>
            <details>
              <summary>Where do I find news and activities?</summary>
              <p>Confirmed updates are published under <Link href="/nyheter">News</Link> and planned activities under <Link href="/evenemang">Events</Link> (currently in Swedish).</p>
            </details>
          </div>
        </div>
      </section>
      <section id="form" className="home-join">
        <div className="section-wrap join-inner">
          <div className="join-copy">
            <p className="eyebrow">Next step</p>
            <h2>{homeContentEn.formHeading.firstLine}<span>{homeContentEn.formHeading.secondLine}</span></h2>
            <p>Tell us who you are and how you would like to contribute. You choose how much you want to get involved.</p>
            <Link className="text-link" href="/en/contact">Have a question? Contact us ↗</Link>
          </div>
          <JoinForm />
        </div>
      </section>
      <section className="subpage-cta">
        <div>
          <p className="subpage-eyebrow">A movement growing together</p>
          <h2>Make your voice heard.</h2>
        </div>
        <Link className="button button-primary" href="/ga-med">Join CFD Sweden ↗</Link>
      </section>
      <EnSiteFooter />
    </main>
  );
}
