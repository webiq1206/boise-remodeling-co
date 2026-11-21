import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { familyButtonClass } from "@/components/family/Button";
import { CTA_REQUEST, HOME_ESTIMATOR_PROJECTS, REQUEST_PATH, estimatorHref } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import styles from "./HomeInstantEstimateProjects.module.css";

/**
 * The homepage block where the planning range slider used to be (owner,
 * 21 November 2026: one source of prices). The slider ran this site's own
 * older engine and showed figures that differed from the P5 instant
 * estimator, so it was retired; PlanningRangeExplorer.tsx stays in the
 * repository, unmounted. This block shows no figure: it opens the central
 * estimator on each project it prices, with the path to a person beside it.
 *
 * `#planning-ranges` is kept as an anchor at the top of the block so old
 * links from outside the site (Google Business Profile posts, downloaded
 * guides) still land here. Every link inside the site goes to
 * /instant-estimate.
 */
export function HomeInstantEstimateProjects() {
  return (
    <section className={`fr-band ${styles.section}`} id="estimate-by-project" aria-labelledby="estimate-by-project-title" data-home-estimator-projects="">
      <span id="planning-ranges" className={styles.legacyAnchor} aria-hidden="true" />
      <div className="f-section f-container">
        <div className={styles.intro}>
          <div>
            <p className="f-eyebrow">INSTANT ESTIMATE</p>
            <h2 id="estimate-by-project-title">Start with your project.<br /><em>See a preliminary range.</em></h2>
          </div>
          <p>Pick your project and see a preliminary price range from our instant estimate.</p>
        </div>
        {/* Wrapped so the family rule for a list directly inside .f-section does not restyle it. */}
        <div>
          <ul className={styles.projects} aria-label="Projects our instant estimate prices">
            {HOME_ESTIMATOR_PROJECTS.map((project) => (
              <li key={project.id}>
                <Link
                  className={familyButtonClass({ variant: "secondary", size: "lg", tone: "dark", className: styles.project })}
                  href={estimatorHref(project.id)}
                  data-estimator-project={project.id}
                >
                  {project.label}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
            {/* The eighth tile opens the estimator's own project chooser, and fills the grid's last row. */}
            <li>
              <Link
                className={familyButtonClass({ variant: "secondary", size: "lg", tone: "dark", className: styles.project })}
                href={estimatorHref()}
                data-estimator-project="choose"
              >
                Not sure yet
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
        <div className={styles.person}>
          <p>Rather talk it through with a person?</p>
          <div className={styles.personActions}>
            <Link className={familyButtonClass({ variant: "tertiary", tone: "dark" })} href={REQUEST_PATH}>{CTA_REQUEST}</Link>
            <a className={familyButtonClass({ variant: "tertiary", tone: "dark" })} href={SITE_CONFIG.phoneHref} data-testid="link-phone-estimate-block">
              <Phone size={18} strokeWidth={1.5} aria-hidden="true" />
              Call {SITE_CONFIG.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
