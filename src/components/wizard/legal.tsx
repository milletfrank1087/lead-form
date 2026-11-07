import type { ReactNode } from "react";

export type LegalKey = "terms" | "privacy";

/**
 * Terms and Privacy shown in the modal on the documents step. Placeholder-quality copy written for
 * this flow: replace it with counsel-reviewed text before relying on it.
 */
export const LEGAL: Record<LegalKey, { title: string; body: ReactNode }> = {
  terms: {
    title: "Terms of Application",
    body: (
      <>
        <h4>1. What this application is</h4>
        <p>
          This form is an <strong>application</strong>, not an agreement and not an offer of a
          partnership. Submitting it does not create a contract, a partnership, an employment
          relationship, or any obligation on our part. Every application is reviewed individually.
        </p>

        <h4>2. What we do with your details</h4>
        <p>
          You are applying for a role where a US LLC is formed in your legal name and its banking and
          payment processing accounts are opened. To assess that, we collect your legal name, email,
          mobile number, a credit score range, your stated availability, and — later, in conversation —
          identity documents and bank statements.
        </p>
        <p>
          Your details are used to assess this application and to run onboarding. They are{" "}
          <strong>not sold, rented or shared</strong> with third parties for marketing.
        </p>

        <h4>3. Credit</h4>
        <p>
          <strong>We do not run a soft or hard credit check.</strong> The range you select is your own
          estimate and is used only to work out which banking options may be available to you. A lower
          range is not an automatic refusal: it routes your application to a review of banking options
          instead.
        </p>

        <h4>4. What we ask of you</h4>
        <ul>
          <li>Provide accurate information, and only documents that are genuinely yours.</li>
          <li>Respond to identity and verification requests within the availability window you chose.</li>
          <li>Tell us promptly if anything changes.</li>
        </ul>
        <p>
          Verification requests from banks and processors are time-limited. Missing one does not end
          your application, but it does delay it.
        </p>

        <h4>5. What we never ask for</h4>
        <p>
          We will never ask for your Social Security number in chat, your bank login, your card number,
          a PIN, or any payment from you. <strong>There is no fee to apply and no fee to participate.</strong>{" "}
          If anyone claiming to represent us asks for those things, stop and tell us.
        </p>

        <h4>6. Accuracy and refusal</h4>
        <p>
          We may decline or close an application where information is materially false, where documents
          do not belong to the applicant, or where the arrangement cannot lawfully proceed.
        </p>

        <h4>7. Eligibility</h4>
        <p>
          You must be a US resident aged 21 or over, and legally able to enter into the arrangement
          described to you during onboarding.
        </p>

        <h4>8. Governing terms</h4>
        <p>
          The written agreement, issued later in the process, sets out the actual terms of any
          partnership. Where this application and that agreement differ, the agreement governs.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    body: (
      <>
        <h4>What we collect</h4>
        <ul>
          <li>
            <strong>Application details:</strong> legal name, email, mobile number, credit range,
            availability window and timezone.
          </li>
          <li>
            <strong>Onboarding documents:</strong> government ID, a selfie holding it, bank statements
            and proof of address, collected in conversation after you apply.
          </li>
          <li>
            <strong>Technical data:</strong> approximate location derived from your connection, device
            and browser type, and which pages you reached.
          </li>
        </ul>

        <h4>Why we collect it</h4>
        <p>
          To assess your application, to form the entity and open accounts where the application
          proceeds, to meet identity-verification and anti-money-laundering obligations, and to keep a
          record of what was agreed.
        </p>

        <h4>Who sees it</h4>
        <p>
          Our partnerships team, and the banks, payment processors and formation agents involved in
          setting up your entity and accounts. We share only what those parties need for that purpose.{" "}
          <strong>We do not sell your data.</strong>
        </p>

        <h4>How long we keep it</h4>
        <p>
          For as long as your application or partnership is active, and afterwards for the period our
          compliance obligations require. Identity records are typically retained for several years
          after an account closes.
        </p>

        <h4>Your choices</h4>
        <ul>
          <li>You can ask what we hold about you, and ask for corrections.</li>
          <li>You can withdraw an application at any time before an entity is formed.</li>
          <li>You can ask us to delete data we are not required to retain.</li>
        </ul>

        <h4>Cookies and tracking</h4>
        <p>
          We use cookies and advertising pixels to measure which campaigns bring applicants, and to
          understand where people stop in the form. These do not identify you by name to third parties.
        </p>

        <h4>Never in chat</h4>
        <p>
          We never ask for your Social Security number in chat, your bank login, card number or PIN. If
          anyone claiming to represent us asks for those, stop and report it.
        </p>

        <h4>Contact</h4>
        <p>
          Questions about your data can go to the same address you applied to, or to the contact details
          on your partner file.
        </p>
      </>
    ),
  },
};
