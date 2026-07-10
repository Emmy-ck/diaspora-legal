#!/usr/bin/env node
/**
 * Enrich public/data/services.json with images + deeper page content.
 * Safe to re-run — merges by slug without wiping existing fields.
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'public/data/services.json');

const IMAGE_BY_SLUG = {
  'family-law': { image: '/images/services/family.jpg', imageAlt: 'Family together at home — family law support for diaspora clients' },
  'property-law': { image: '/images/services/property.jpg', imageAlt: 'House keys and property documents for Kenyan conveyancing' },
  'business-law': { image: '/images/services/business.jpg', imageAlt: 'Business planning documents and laptop for commercial legal advice' },
  'immigration-issues': { image: '/images/services/immigration.jpg', imageAlt: 'Airplane wing above clouds — immigration and travel documentation' },
  'land-disputes': { image: '/images/services/land.jpg', imageAlt: 'Open land and fields representing Kenyan land dispute matters' },
  succession: { image: '/images/services/succession.jpg', imageAlt: 'Quiet study desk for estate planning and succession documents' },
  litigation: { image: '/images/services/court.jpg', imageAlt: 'Gavel and law books representing litigation and court advocacy' },
  contracts: { image: '/images/services/documents.jpg', imageAlt: 'Contract documents ready for independent legal review' },
  agreements: { image: '/images/services/documents.jpg', imageAlt: 'Signed agreements prepared for advocate review' },
  leases: { image: '/images/services/lease.jpg', imageAlt: 'Modern apartment interior for lease and tenancy review' },
  'conveyancing-documentation': { image: '/images/services/property.jpg', imageAlt: 'Property paperwork for conveyancing documentation review' },
  affidavits: { image: '/images/services/affidavit.jpg', imageAlt: 'Handshake over documents — affidavits prepared for filing' },
  'drafting-contracts': { image: '/images/services/drafting.jpg', imageAlt: 'Advocate drafting a contract at a desk' },
  notices: { image: '/images/services/drafting.jpg', imageAlt: 'Formal legal notice being prepared for service' },
  'drafting-agreements': { image: '/images/services/documents.jpg', imageAlt: 'Agreement drafts prepared to Kenyan legal standards' },
  'statutory-declarations': { image: '/images/services/affidavit.jpg', imageAlt: 'Statutory declaration documents ready for commissioning' },
  pleading: { image: '/images/services/court.jpg', imageAlt: 'Court pleadings and case files for litigation support' },
  'property-searches': { image: '/images/services/search.jpg', imageAlt: 'Financial and registry records used in property searches' },
  'company-search': { image: '/images/services/search.jpg', imageAlt: 'Company registry research and due diligence records' },
  'court-search': { image: '/images/services/court.jpg', imageAlt: 'Court records research for litigation due diligence' },
  'business-verification': { image: '/images/services/business.jpg', imageAlt: 'Business verification and compliance document review' },
  'property-verification': { image: '/images/services/property.jpg', imageAlt: 'Property title verification before purchase or transfer' },
  'business-registration': { image: '/images/services/registration.jpg', imageAlt: 'Professional registration and company formation support' },
  'ngo-registration': { image: '/images/services/ngo.jpg', imageAlt: 'Community organisation meeting for NGO registration support' },
  'trademark-registration': { image: '/images/services/trademark.jpg', imageAlt: 'Brand and trademark protection for Kenyan businesses' },
  'document-registration': { image: '/images/services/documents.jpg', imageAlt: 'Official document registration and stamping support' },
  'annual-returns': { image: '/images/services/registration.jpg', imageAlt: 'Corporate compliance and annual returns filing support' },
};

const ENRICHMENT = {
  'family-law': {
    overviewExtra: [
      'Matters we commonly handle include marriage solemnisation support, separation and divorce filings, child custody and access arrangements, maintenance applications, and related affidavits or consent agreements.',
      'You stay informed through secure updates. Where court attendance in Kenya is required, your assigned advocate coordinates local representation so distance does not stall progress.',
    ],
    highlights: [
      'Confidential advocate consultation tailored to diaspora circumstances',
      'Custody, maintenance, and matrimonial property guidance',
      'Preparation of petitions, affidavits, and consent agreements',
      'Coordination of Kenyan filings while you remain abroad',
      'Clear timelines and status updates at each stage',
    ],
    whoItsFor: [
      'Kenyans abroad facing separation, divorce, or custody questions',
      'Parents seeking maintenance or access arrangements under Kenyan law',
      'Spouses needing matrimonial property or settlement advice',
      'Families who want discreet, remote-friendly legal support',
    ],
    outcomes: [
      'A clear legal pathway and priority list for your matter',
      'Court-ready or registry-ready documents where required',
      'Negotiated settlements where amicable resolution is possible',
      'Ongoing representation through hearings when needed',
    ],
    faqsExtra: [
      {
        q: 'How long do family matters usually take?',
        a: 'Timelines vary with complexity and court diaries. After intake, your advocate gives a realistic range and flags any urgent interim steps.',
      },
      {
        q: 'Can my spouse or relative in Kenya work with the same advocate?',
        a: 'Only where there is no conflict of interest. We assess conflicts carefully and may recommend separate representation when required.',
      },
    ],
  },
  'property-law': {
    overviewExtra: [
      'Support covers sale and purchase advice, title review, transfer documentation, leasehold issues, and early dispute strategy before positions harden.',
      'We work with registry processes and local advocates so diaspora owners can move transactions forward without flying home for every step.',
    ],
    highlights: [
      'Title and ownership risk review before you commit funds',
      'Sale agreements and conveyancing document support',
      'Guidance on transfers, caveats, and related filings',
      'Dispute strategy for boundary, ownership, or payment issues',
      'Remote coordination with Kenyan registries and counterparties',
    ],
    whoItsFor: [
      'Diaspora buyers purchasing land or homes in Kenya',
      'Owners selling, transferring, or refinancing property',
      'Families resolving shared ownership or inheritance-linked land issues',
      'Investors needing advocate oversight on conveyancing paperwork',
    ],
    outcomes: [
      'Documented understanding of title and transaction risks',
      'Agreements and transfer papers prepared for execution',
      'A practical plan for completion or dispute resolution',
      'Reduced exposure to incomplete or unsafe deals',
    ],
    faqsExtra: [
      {
        q: 'Do you conduct land searches as part of property advice?',
        a: 'Yes. Property searches and verification are often the first step. We can bundle them with agreement review and conveyancing support.',
      },
      {
        q: 'Can you act if I already signed a sale agreement?',
        a: 'Yes. We review what was signed, identify risks, and advise on completion, variation, or dispute options.',
      },
    ],
  },
  'business-law': {
    overviewExtra: [
      'Typical work includes entity structuring advice, shareholder and founder arrangements, commercial contract strategy, and compliance questions for Kenyan operations.',
      'Whether you are launching, expanding, or cleaning up governance from abroad, we keep advice practical and document-ready.',
    ],
    highlights: [
      'Commercial contract and shareholder guidance',
      'Company structure and governance advice',
      'Compliance-oriented review for Kenyan operations',
      'Support negotiating with local partners or suppliers',
      'Coordination with registration and filing workstreams',
    ],
    whoItsFor: [
      'Diaspora founders starting or scaling Kenyan ventures',
      'Shareholders needing clearer agreements or exit terms',
      'Businesses reviewing supplier, distribution, or service contracts',
      'Owners seeking compliance and governance cleanup',
    ],
    outcomes: [
      'Clear commercial terms and risk allocation',
      'Stronger governance documents and decision rights',
      'Actionable compliance recommendations',
      'Contracts ready for signature and implementation',
    ],
    faqsExtra: [
      {
        q: 'Can you help before we incorporate?',
        a: 'Yes. Early structuring advice often prevents expensive rework later. We can also connect you to business registration support.',
      },
      {
        q: 'Do you draft and review shareholder agreements?',
        a: 'Yes. We prepare and review founder, shareholder, and investment-related agreements tailored to Kenyan company practice.',
      },
    ],
  },
  'immigration-issues': {
    overviewExtra: [
      'We assist with documentation pathways, permit-related queries, citizenship and dual-status questions, and coordination of filings that require Kenyan advocate oversight.',
      'Every matter starts with eligibility and document readiness so you avoid incomplete applications and avoidable delays.',
    ],
    highlights: [
      'Pathway assessment for permits, status, and documentation',
      'Document checklists tailored to your facts',
      'Advocate review before submission',
      'Coordination with local processes where appearance or attestation is needed',
      'Status updates while applications progress',
    ],
    whoItsFor: [
      'Diaspora clients managing Kenyan immigration paperwork',
      'Families coordinating status or documentation across borders',
      'Professionals needing permit or compliance guidance',
      'Clients who want advocate review before filing',
    ],
    outcomes: [
      'A documented pathway and filing plan',
      'Complete supporting document packages',
      'Reduced risk of rejected or incomplete submissions',
      'Clear next steps if further evidence is requested',
    ],
    faqsExtra: [
      {
        q: 'Do you guarantee approval of immigration applications?',
        a: 'No advocate can guarantee outcomes. We focus on accurate preparation, complete documentation, and clear advice on realistic options.',
      },
      {
        q: 'Can you work with documents issued outside Kenya?',
        a: 'Yes. We advise on authentication, translation, and supporting evidence commonly required for Kenyan processes.',
      },
    ],
  },
  'land-disputes': {
    overviewExtra: [
      'Disputes may involve boundaries, competing claims, family land, fraudulent transfers, or stalled conveyancing. Early evidence preservation and strategy matter.',
      'We help you assess strength of claim, gather records, and choose negotiation, mediation, or court pathways with eyes open on cost and time.',
    ],
    highlights: [
      'Claim assessment and evidence mapping',
      'Registry and document trail review',
      'Demand letters and negotiation support',
      'Litigation strategy where court action is necessary',
      'Remote briefings for diaspora owners',
    ],
    whoItsFor: [
      'Owners facing encroachment or boundary conflicts',
      'Families in contested land ownership disputes',
      'Buyers or sellers stuck after a disputed transaction',
      'Diaspora clients who cannot monitor local developments daily',
    ],
    outcomes: [
      'A written assessment of options and risks',
      'Organised evidence and registry records',
      'Settlement attempts where commercially sensible',
      'Court-ready pleadings when litigation is required',
    ],
    faqsExtra: [
      {
        q: 'Should I wait until I travel to Kenya to start?',
        a: 'Usually no. Delay can weaken evidence and positions. We can open the matter remotely and coordinate local steps.',
      },
      {
        q: 'Do you handle both negotiation and court filings?',
        a: 'Yes. Many disputes resolve without a full trial, but we prepare for formal proceedings when needed.',
      },
    ],
  },
  succession: {
    overviewExtra: [
      'We support wills guidance, probate and administration pathways, estate asset mapping, and family communication where multiple beneficiaries are involved.',
      'Diaspora executors and heirs often need a single advocate team to gather documents, file applications, and keep beneficiaries informed.',
    ],
    highlights: [
      'Probate and administration pathway advice',
      'Estate document and asset inventory support',
      'Beneficiary communication frameworks',
      'Preparation of succession filings and affidavits',
      'Coordination of Kenyan estate processes from abroad',
    ],
    whoItsFor: [
      'Executors and administrators living outside Kenya',
      'Heirs seeking clarity on estate distribution',
      'Families preparing wills or succession planning documents',
      'Clients managing cross-border estate complications',
    ],
    outcomes: [
      'A clear succession process map',
      'Filing packages prepared for court or registry requirements',
      'Reduced family conflict through structured communication',
      'Progress toward lawful distribution of estate assets',
    ],
    faqsExtra: [
      {
        q: 'What if there is no will?',
        a: 'Intestate succession rules apply. Your advocate explains the legal order of beneficiaries and the administration steps required.',
      },
      {
        q: 'Can estate matters proceed if some heirs live abroad?',
        a: 'Yes. Many steps can be handled with remote instructions, powers of attorney where appropriate, and local advocate coordination.',
      },
    ],
  },
  litigation: {
    overviewExtra: [
      'Litigation support covers claim assessment, pleadings, evidence organisation, hearing preparation, and settlement evaluation throughout the life of a case.',
      'We emphasise early case theory so you understand prospects, costs, and alternatives before committing to a full contest.',
    ],
    highlights: [
      'Merits assessment and litigation risk briefing',
      'Pleadings, affidavits, and witness statement support',
      'Hearing preparation and advocate representation pathways',
      'Settlement and mediation options reviewed continuously',
      'Structured updates for clients abroad',
    ],
    whoItsFor: [
      'Clients considering or defending a Kenyan lawsuit',
      'Businesses in commercial disputes',
      'Individuals needing court representation coordinated remotely',
      'Parties who want a realistic view before filing',
    ],
    outcomes: [
      'Documented case strategy and timeline',
      'Court filings prepared to required standards',
      'Informed decisions on settle-versus-proceed',
      'Active representation through key milestones',
    ],
    faqsExtra: [
      {
        q: 'Will I need to appear in court in person?',
        a: 'It depends on the matter and court directions. Your advocate advises when personal appearance is required and when local representation suffices.',
      },
      {
        q: 'Can you take over an existing case?',
        a: 'Yes, subject to conflict checks and a file review. We assess pleadings, evidence, and next hearing dates before confirming scope.',
      },
    ],
  },
  contracts: {
    overviewExtra: [
      'Review focuses on payment terms, liability, termination, dispute resolution, governing law, and practical enforceability in a Kenyan context.',
      'You receive annotated findings and recommended revisions — not just a vague “looks fine” sign-off.',
    ],
    highlights: [
      'Clause-by-clause risk review',
      'Plain-language summary of key obligations',
      'Suggested redlines and negotiation points',
      'Kenyan enforceability considerations',
      'Follow-up clarification call where needed',
    ],
    whoItsFor: [
      'Clients asked to sign commercial contracts quickly',
      'Diaspora parties contracting with Kenyan counterparties',
      'Businesses refreshing template agreements',
      'Individuals reviewing high-value personal contracts',
    ],
    outcomes: [
      'A written risk memo on material clauses',
      'Proposed amendments you can take to negotiation',
      'Clear go / negotiate / walk-away guidance',
      'Greater confidence before signature',
    ],
    faqsExtra: [
      {
        q: 'How fast can a contract review be completed?',
        a: 'Simple agreements can often be reviewed within a few business days. Complex or multi-document packages are scoped after intake.',
      },
      {
        q: 'Do you negotiate directly with the other side?',
        a: 'On request. Many clients prefer a review memo first, then advocate-led negotiation if terms remain contested.',
      },
    ],
  },
  agreements: {
    overviewExtra: [
      'We review settlement, partnership, family, and commercial agreements for clarity, completeness, and unintended obligations.',
      'Where terms are incomplete, we flag gaps that commonly cause later disputes — payment triggers, default remedies, and exit mechanics.',
    ],
    highlights: [
      'Structure and completeness review',
      'Risk flags on ambiguous or one-sided terms',
      'Alignment checks with your stated commercial goals',
      'Revision recommendations ready for counterparties',
      'Optional drafting support after review',
    ],
    whoItsFor: [
      'Parties finalising settlement or partnership agreements',
      'Families documenting consent or support arrangements',
      'Businesses entering joint venture or collaboration terms',
      'Clients who want a second set of advocate eyes before signing',
    ],
    outcomes: [
      'Clearer, tighter agreement language',
      'Identified gaps and negotiation priorities',
      'Reduced chance of unenforceable or vague clauses',
      'A cleaner path to signature',
    ],
    faqsExtra: [
      {
        q: 'Is review different from drafting?',
        a: 'Yes. Review critiques an existing draft. Drafting builds the document from your instructions. We offer both and can combine them.',
      },
      {
        q: 'Can you review WhatsApp or email “agreements”?',
        a: 'We can assess whether informal exchanges create risk and whether a formal written agreement is advisable.',
      },
    ],
  },
  leases: {
    overviewExtra: [
      'Lease review covers rent, deposits, repair obligations, termination, assignment, and dispute clauses that often surprise tenants and landlords.',
      'For diaspora landlords, we also check whether management and payment arrangements are clearly documented.',
    ],
    highlights: [
      'Tenant and landlord obligation mapping',
      'Deposit, rent escalation, and default review',
      'Repair, alteration, and handover clause checks',
      'Termination and renewal risk analysis',
      'Practical negotiation points for safer terms',
    ],
    whoItsFor: [
      'Tenants signing residential or commercial leases in Kenya',
      'Diaspora landlords leasing property remotely',
      'Businesses taking office or retail space',
      'Parties renewing or exiting existing leases',
    ],
    outcomes: [
      'A plain summary of your real obligations',
      'Recommended amendments before signature',
      'Fewer surprises on deposits, repairs, and exit',
      'Stronger documentation for remote property management',
    ],
    faqsExtra: [
      {
        q: 'Should both landlord and tenant use the same advocate?',
        a: 'No. Each side should have independent advice to avoid conflicts and protect their interests.',
      },
      {
        q: 'Can you help if a lease dispute has already started?',
        a: 'Yes. We review the signed lease, correspondence, and remedies available under Kenyan law.',
      },
    ],
  },
  'conveyancing-documentation': {
    overviewExtra: [
      'Conveyancing packs often include sale agreements, transfer forms, consents, and supporting affidavits. Incomplete sets cause registry delays.',
      'We review the package for consistency, missing schedules, and execution formalities before you commit to completion.',
    ],
    highlights: [
      'Full conveyancing pack consistency review',
      'Checks on parties, property description, and consideration',
      'Execution and attestation readiness',
      'Flagging of missing consents or annexures',
      'Coordination notes for completion day',
    ],
    whoItsFor: [
      'Buyers and sellers approaching completion',
      'Diaspora clients reviewing papers prepared locally',
      'Families transferring property between relatives',
      'Anyone unsure whether a conveyancing file is complete',
    ],
    outcomes: [
      'A completion-ready document checklist',
      'Corrections before registry presentation',
      'Lower risk of rejected filings',
      'Clearer allocation of who signs what, and when',
    ],
    faqsExtra: [
      {
        q: 'Do you prepare conveyancing documents as well as review them?',
        a: 'Yes. Review and drafting can be combined depending on how complete the current pack is.',
      },
      {
        q: 'What usually causes conveyancing delays?',
        a: 'Missing consents, inconsistent party details, incomplete schedules, and unsigned or improperly attested pages are common causes.',
      },
    ],
  },
  affidavits: {
    overviewExtra: [
      'Affidavits must be factual, properly structured, and commissioned correctly. Weak drafting undermines applications even when the underlying case is strong.',
      'We interview you for facts, draft clearly, and guide execution formalities suitable for Kenyan filing.',
    ],
    highlights: [
      'Fact-gathering interview and issue spotting',
      'Clear, court-ready affidavit drafting',
      'Annexure and exhibit organisation',
      'Guidance on commissioning and execution',
      'Revisions after advocate or court feedback',
    ],
    whoItsFor: [
      'Clients filing family, succession, or civil applications',
      'Diaspora deponents who need remote drafting support',
      'Parties responding to court directions for affidavits',
      'Anyone who needs a precise sworn statement',
    ],
    outcomes: [
      'A structured affidavit aligned to your application',
      'Organised exhibits that support key facts',
      'Execution guidance that avoids technical rejection',
      'Faster progression of the related filing',
    ],
    faqsExtra: [
      {
        q: 'Can I swear an affidavit while abroad?',
        a: 'Often yes, subject to the receiving court’s or registry’s requirements. Your advocate advises the acceptable commissioning route.',
      },
      {
        q: 'What should I prepare before drafting starts?',
        a: 'A chronology, key documents, names of relevant people, and the exact order or application the affidavit supports.',
      },
    ],
  },
  'drafting-contracts': {
    overviewExtra: [
      'We draft contracts from your commercial brief — parties, scope, price, timelines, risk allocation, and dispute pathways — in language that is clear and usable.',
      'Templates are adapted to your deal rather than copied blindly, so Kenyan context and enforceability stay in view.',
    ],
    highlights: [
      'Custom drafting from a structured intake brief',
      'Balanced risk allocation and remedy clauses',
      'Clear payment, delivery, and acceptance terms',
      'Dispute resolution and governing law provisions',
      'Revision rounds until the draft is signature-ready',
    ],
    whoItsFor: [
      'Businesses needing new supplier or service contracts',
      'Founders documenting commercial relationships',
      'Clients replacing informal arrangements with formal contracts',
      'Teams that want Kenyan-ready drafts, not generic templates',
    ],
    outcomes: [
      'A complete first draft tailored to your deal',
      'Negotiable positions identified in advance',
      'Reduced ambiguity that causes later disputes',
      'A final version ready for execution',
    ],
    faqsExtra: [
      {
        q: 'How many revision rounds are included?',
        a: 'Engagements typically include structured revision rounds after your feedback and after counterparty comments. Scope is confirmed at intake.',
      },
      {
        q: 'Can you start from our existing template?',
        a: 'Yes. We can rebuild or heavily revise an internal template so it fits Kenyan practice and your current transaction.',
      },
    ],
  },
  notices: {
    overviewExtra: [
      'Statutory and contractual notices must meet form, timing, and service requirements. A defective notice can delay or defeat an otherwise valid claim.',
      'We draft demand letters, termination notices, and related formal correspondence with the end process in mind.',
    ],
    highlights: [
      'Correct form and content for the intended legal step',
      'Timeline and service method guidance',
      'Firm but professional tone calibrated to your goals',
      'Record-keeping pack for proof of service',
      'Follow-on strategy if the recipient does not comply',
    ],
    whoItsFor: [
      'Landlords, tenants, and contracting parties issuing formal notice',
      'Creditors preparing demand correspondence',
      'Clients responding to notices already received',
      'Anyone who needs a notice that will stand up later in dispute',
    ],
    outcomes: [
      'A notice that meets contractual or legal formalities',
      'Clear deadlines and demanded actions',
      'Evidence trail for service',
      'Defined next steps if ignored',
    ],
    faqsExtra: [
      {
        q: 'Is a WhatsApp message enough as notice?',
        a: 'Sometimes contracts allow electronic notice, but many do not. We check the agreement and applicable rules before relying on informal channels.',
      },
      {
        q: 'Can you draft a response to a notice I received?',
        a: 'Yes. We assess validity, deadlines, and response options, then prepare an appropriate reply or counter-notice.',
      },
    ],
  },
  'drafting-agreements': {
    overviewExtra: [
      'Agreement drafting covers settlements, family consent terms, commercial collaborations, and other arrangements that need precise, enforceable wording.',
      'We translate negotiated points into clauses that reduce later “but we meant…” disagreements.',
    ],
    highlights: [
      'Structured capture of deal points before drafting',
      'Plain, enforceable clause language',
      'Schedules and annexures organised cleanly',
      'Signature and witnessing guidance',
      'Optional review after counterparty edits',
    ],
    whoItsFor: [
      'Parties who have agreed in principle and need formal wording',
      'Families documenting settlements or support terms',
      'Businesses formalising collaborations',
      'Clients replacing handshake deals with written agreements',
    ],
    outcomes: [
      'A complete agreement reflecting the true bargain',
      'Fewer ambiguous obligations',
      'Execution-ready signature pages',
      'A durable record if disputes arise later',
    ],
    faqsExtra: [
      {
        q: 'What if negotiations are still fluid?',
        a: 'We can draft a term sheet first, then convert settled points into a full agreement once positions stabilise.',
      },
      {
        q: 'Do you handle bilingual or dual-jurisdiction concerns?',
        a: 'We draft for Kenyan use and flag cross-border issues. Where foreign law advice is needed, we say so clearly.',
      },
    ],
  },
  'statutory-declarations': {
    overviewExtra: [
      'Statutory declarations are used to formally declare facts for registries, banks, and official processes. Accuracy and proper form are essential.',
      'We prepare declarations that match the receiving institution’s expectations and guide you through commissioning.',
    ],
    highlights: [
      'Purpose-fit declaration drafting',
      'Fact verification against supporting documents',
      'Correct formal layout and wording',
      'Commissioning and identity guidance',
      'Quick revisions if the receiving office requests changes',
    ],
    whoItsFor: [
      'Clients meeting bank, registry, or institutional requirements',
      'Diaspora applicants needing Kenyan-form declarations',
      'Parties replacing lost documents with formal declarations where allowed',
      'Anyone directed to file a statutory declaration',
    ],
    outcomes: [
      'A declaration accepted in form by the target process',
      'Aligned supporting evidence',
      'Clear commissioning instructions',
      'Fewer back-and-forth rejections on technicalities',
    ],
    faqsExtra: [
      {
        q: 'How is a statutory declaration different from an affidavit?',
        a: 'Both are formal statements, but they serve different procedural contexts. Your advocate selects the correct instrument for the receiving office or court.',
      },
      {
        q: 'What identity documents do I need?',
        a: 'Usually a government-issued ID and any documents referenced in the declaration. We confirm the exact list for your matter.',
      },
    ],
  },
  pleading: {
    overviewExtra: [
      'Pleadings frame the legal and factual case. Poor pleadings create lasting problems; strong pleadings preserve remedies and clarify issues for hearing.',
      'We draft or revise plaints, defences, replies, and related court documents with a coherent case theory.',
    ],
    highlights: [
      'Case theory and cause-of-action mapping',
      'Drafting of core pleadings and supporting documents',
      'Consistency checks across affidavits and annexures',
      'Amendment strategy when facts evolve',
      'Hearing-oriented organisation of issues',
    ],
    whoItsFor: [
      'Claimants preparing to file suit',
      'Defendants responding to claims',
      'Clients whose existing pleadings need repair',
      'Diaspora litigants needing remote drafting support',
    ],
    outcomes: [
      'Pleadings aligned to your remedies and evidence',
      'Clearer issues for negotiation or trial',
      'Reduced technical objections',
      'A stronger foundation for later applications',
    ],
    faqsExtra: [
      {
        q: 'Can pleadings be amended later?',
        a: 'Often yes, subject to court rules and timing. Early accuracy is still better — amendments can cost time and invite opposition.',
      },
      {
        q: 'Do you also prepare witness statements?',
        a: 'Yes. Witness statements and affidavits are commonly prepared alongside pleadings as the evidence picture develops.',
      },
    ],
  },
  'property-searches': {
    overviewExtra: [
      'Property searches help confirm registered ownership, encumbrances, and related registry particulars before money changes hands.',
      'Results are delivered with a plain-language briefing so you know what is clean, what is unclear, and what needs deeper verification.',
    ],
    highlights: [
      'Targeted land registry search scoping',
      'Ownership and encumbrance summary',
      'Flags for anomalies needing follow-up',
      'Bundle options with verification or agreement review',
      'Remote delivery suitable for diaspora decision-making',
    ],
    whoItsFor: [
      'Buyers performing pre-purchase due diligence',
      'Lenders or partners checking property status',
      'Owners confirming current registry particulars',
      'Advocates and clients preparing conveyancing files',
    ],
    outcomes: [
      'Search results with an advocate briefing',
      'Early warning of liens, caveats, or inconsistencies',
      'A go / pause / investigate recommendation',
      'Cleaner inputs for sale agreements and transfers',
    ],
    faqsExtra: [
      {
        q: 'Is a search enough to prove a safe purchase?',
        a: 'A search is necessary but not always sufficient. Complex histories may need physical verification, survey input, or deeper title review.',
      },
      {
        q: 'How recent should a search be before completion?',
        a: 'Use current results close to completion. Older searches can miss later registrations or encumbrances.',
      },
    ],
  },
  'company-search': {
    overviewExtra: [
      'Company searches surface registration status, directors, and filing indicators that inform investment, supply, or partnership decisions.',
      'We present findings in a decision-ready format and note gaps that warrant business verification beyond the public record.',
    ],
    highlights: [
      'Company registry extract and status review',
      'Director and filing snapshot',
      'Red-flag commentary for counterparties',
      'Optional bundling with contract or investment review',
      'Clear summary for remote stakeholders',
    ],
    whoItsFor: [
      'Investors vetting Kenyan companies',
      'Businesses checking suppliers or distributors',
      'Founders confirming their own filing posture',
      'Clients entering joint ventures or share deals',
    ],
    outcomes: [
      'A concise company status brief',
      'Visibility on who controls the entity on record',
      'Identified follow-up questions before you commit',
      'Better-informed contracting and investment decisions',
    ],
    faqsExtra: [
      {
        q: 'Does a clean company search mean the business is trustworthy?',
        a: 'No. Registry data is a starting point. Financial, litigation, and operational checks may still be needed.',
      },
      {
        q: 'Can you search multiple related companies?',
        a: 'Yes. Group or related-party searches are scoped as a package when corporate structures are complex.',
      },
    ],
  },
  'court-search': {
    overviewExtra: [
      'Court searches help reveal known case involvement that may affect transactions, employment decisions, or dispute strategy.',
      'Findings are summarised with context — what appears on record, what it may mean, and what further inquiry is sensible.',
    ],
    highlights: [
      'Targeted court record enquiries',
      'Matter listing summaries where available',
      'Risk commentary for transactions or hiring',
      'Coordination with litigation strategy if hits appear',
      'Confidential handling of sensitive results',
    ],
    whoItsFor: [
      'Buyers and investors performing counterparty checks',
      'Employers and partners conducting elevated due diligence',
      'Clients validating whether related disputes exist',
      'Advocates building an evidence picture',
    ],
    outcomes: [
      'A written court-search briefing',
      'Early visibility of litigation exposure',
      'Informed go / hold decisions',
      'Leads for deeper case-file review when needed',
    ],
    faqsExtra: [
      {
        q: 'Are court searches guaranteed to find every case?',
        a: 'No search is exhaustive in every forum. We explain coverage limits and recommend extra steps where risk is high.',
      },
      {
        q: 'How do you handle confidential personal data?',
        a: 'Results are shared only with instructing clients and used for the stated due-diligence purpose under professional confidentiality.',
      },
    ],
  },
  'business-verification': {
    overviewExtra: [
      'Business verification goes beyond a single registry extract — it tests whether the story you were told matches available records and documents.',
      'We combine registry checks, document review, and targeted questions so you can proceed, renegotiate, or walk away with clarity.',
    ],
    highlights: [
      'Multi-source verification plan',
      'Document authenticity and consistency checks',
      'Director, address, and status corroboration',
      'Practical risk rating for your transaction',
      'Recommendations on contract protections',
    ],
    whoItsFor: [
      'Diaspora investors remote from day-to-day operations',
      'Companies onboarding high-value Kenyan counterparties',
      'Buyers in share or asset deals',
      'Clients who received incomplete or conflicting business papers',
    ],
    outcomes: [
      'A verification report with clear findings',
      'List of unresolved risks and how to mitigate them',
      'Stronger negotiation leverage',
      'Confidence to proceed — or documented reasons not to',
    ],
    faqsExtra: [
      {
        q: 'How long does verification take?',
        a: 'Simple checks may complete within days. Deeper verification depends on document access and third-party response times.',
      },
      {
        q: 'Can verification be anonymous to the target business?',
        a: 'Some steps can be discreet; others require engagement. We agree the approach with you before outreach.',
      },
    ],
  },
  'property-verification': {
    overviewExtra: [
      'Property verification validates that physical, documentary, and registry pictures align — ownership, boundaries, and authority to sell.',
      'It is especially valuable for diaspora buyers who cannot easily inspect or interview neighbours and agents in person.',
    ],
    highlights: [
      'Registry and document cross-checks',
      'Seller authority and mandate review',
      'Flags for boundary or occupation concerns',
      'Coordination notes for survey or site follow-up',
      'Transaction go / pause recommendations',
    ],
    whoItsFor: [
      'Remote buyers purchasing Kenyan land or houses',
      'Families verifying property before inheritance transfers',
      'Lenders and partners needing elevated property comfort',
      'Clients suspicious of rushed or pressured sales',
    ],
    outcomes: [
      'A verification briefing tied to your property',
      'Early detection of mismatched ownership stories',
      'Action list before releasing funds',
      'Cleaner conveyancing once risks are cleared',
    ],
    faqsExtra: [
      {
        q: 'Do you visit the property in person?',
        a: 'Where needed, we coordinate trusted local inspection or survey input. Remote document verification is always included.',
      },
      {
        q: 'Should verification happen before or after the sale agreement?',
        a: 'Ideally before you commit significant funds. If an agreement is already signed, we verify urgently and advise on protections.',
      },
    ],
  },
  'business-registration': {
    overviewExtra: [
      'We guide name checks, entity choice, document preparation, and filing through registration so your company starts on a clean compliance footing.',
      'Diaspora founders receive a sequenced checklist — what we need from you, what we file, and what comes after incorporation.',
    ],
    highlights: [
      'Entity-type guidance for your goals',
      'Name availability and filing preparation',
      'Constitutional and incorporation document support',
      'End-to-end submission coordination',
      'Post-registration compliance starter checklist',
    ],
    whoItsFor: [
      'Diaspora entrepreneurs incorporating in Kenya',
      'Founders formalising an existing informal business',
      'Foreign-linked ventures needing local registration support',
      'Teams that want advocate-led filing, not DIY guesswork',
    ],
    outcomes: [
      'A registered entity ready for banking and contracting',
      'Organised incorporation records',
      'Clarity on immediate post-registration obligations',
      'A foundation for shareholders and governance documents',
    ],
    faqsExtra: [
      {
        q: 'Can I be a director while living abroad?',
        a: 'Often yes, subject to the entity type and regulatory requirements. We confirm eligibility during intake.',
      },
      {
        q: 'Do you also handle KRA or bank introductions?',
        a: 'We provide document packs and practical next-step guidance. Specific agency or bank processes are coordinated as scoped in your engagement.',
      },
    ],
  },
  'ngo-registration': {
    overviewExtra: [
      'NGO and society registrations involve constitutions, official details, and regulator expectations that differ from ordinary companies.',
      'We help founders prepare a coherent file, avoid common deficiencies, and track the application through required stages.',
    ],
    highlights: [
      'Structure and naming guidance for non-profits',
      'Constitution and supporting document preparation',
      'Application file completeness checks',
      'Regulator query response support',
      'Governance basics for post-registration operations',
    ],
    whoItsFor: [
      'Diaspora founders launching Kenyan non-profits',
      'Community groups formalising existing work',
      'Organisations needing constitution cleanup before filing',
      'Boards responding to registration queries',
    ],
    outcomes: [
      'A complete registration application package',
      'Fewer deficiency letters on basic formalities',
      'Documented governance starting point',
      'Clearer path to lawful operations and banking',
    ],
    faqsExtra: [
      {
        q: 'How long does NGO registration take?',
        a: 'Timelines vary with regulator workload and file quality. Complete, consistent applications move faster than incomplete ones.',
      },
      {
        q: 'Can an NGO later convert or work with a company structure?',
        a: 'Different vehicles serve different goals. We advise on structure at the start and on any later restructuring needs.',
      },
    ],
  },
  'trademark-registration': {
    overviewExtra: [
      'Trademark registration protects brand identifiers that distinguish your goods or services. Early filing reduces the risk of copycats and later objections.',
      'We help with search strategy, class selection, application preparation, and responses to straightforward office actions.',
    ],
    highlights: [
      'Brand and class filing strategy',
      'Pre-filing search commentary',
      'Application preparation and submission support',
      'Monitoring for examination queries',
      'Practical advice on brand use and renewal discipline',
    ],
    whoItsFor: [
      'Startups and SMEs building Kenyan brands',
      'Diaspora businesses selling into Kenya',
      'Owners formalising logos, names, or marks already in use',
      'Companies expanding product lines under new marks',
    ],
    outcomes: [
      'A filed trademark application on a sensible class strategy',
      'Documented brand ownership pathway',
      'Better leverage against infringers',
      'A calendar mindset for renewals and watchfulness',
    ],
    faqsExtra: [
      {
        q: 'Should I file before launching publicly?',
        a: 'Filing early is usually wiser. Public use without filing can increase conflict risk if someone else applies first.',
      },
      {
        q: 'What if a similar mark already exists?',
        a: 'We discuss coexistence, redesign, or narrowed goods/services strategies based on search findings before you spend on a weak application.',
      },
    ],
  },
  'document-registration': {
    overviewExtra: [
      'Some instruments require stamping, registration, or official recording to be effective against third parties or to meet transactional conditions.',
      'We identify what must be registered, prepare the file, and coordinate presentation so formalities do not stall your deal.',
    ],
    highlights: [
      'Registration requirement assessment',
      'Document preparation and checklist control',
      'Stamping and filing coordination',
      'Tracking through official processes',
      'Return of endorsed documents to your records',
    ],
    whoItsFor: [
      'Parties closing property or commercial transactions',
      'Clients told a document “must be registered” without a clear path',
      'Diaspora signatories needing local filing support',
      'Teams organising corporate or estate document formalities',
    ],
    outcomes: [
      'Correct formalities completed for the instrument',
      'Reduced risk of unenforceable or incomplete recording',
      'An organised file of endorsed originals/copies',
      'Transaction conditions satisfied on documentation',
    ],
    faqsExtra: [
      {
        q: 'Which documents typically need registration?',
        a: 'It depends on the instrument and purpose — property, security, and certain corporate or personal documents often do. We confirm for your specific papers.',
      },
      {
        q: 'Can you register documents signed abroad?',
        a: 'Often yes, if execution and any notarisation/authentication requirements are met. We advise the correct sequence before you sign.',
      },
    ],
  },
  'annual-returns': {
    overviewExtra: [
      'Annual returns and related filings keep companies in good standing. Missed deadlines create penalties and practical blockers for banking or investment.',
      'We prepare and coordinate filings using your company records, then give you a simple compliance calendar for the next cycle.',
    ],
    highlights: [
      'Filing status review and deadline mapping',
      'Preparation of annual return packs',
      'Director and share data consistency checks',
      'Submission coordination and confirmation records',
      'Forward calendar for the next compliance cycle',
    ],
    whoItsFor: [
      'Diaspora directors of Kenyan companies',
      'SMEs catching up on missed filings',
      'Companies preparing for investment or banking reviews',
      'Secretarial teams wanting advocate oversight',
    ],
    outcomes: [
      'Up-to-date filing posture',
      'Reduced penalty and good-standing risk',
      'Cleaner corporate records',
      'A practical reminder framework for next year',
    ],
    faqsExtra: [
      {
        q: 'What if our company filings are already late?',
        a: 'We assess arrears, prioritise catch-up filings, and outline likely penalties or remediation steps.',
      },
      {
        q: 'Do you need our full accounting file?',
        a: 'We need corporate particulars and supporting registers. Accounting depth depends on the exact filings in scope.',
      },
    ],
  },
};

function uniqueByKey(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  let updated = 0;

  catalog.services = catalog.services.map((service) => {
    const extra = ENRICHMENT[service.slug];
    const imageMeta = IMAGE_BY_SLUG[service.slug];
    if (!extra || !imageMeta) {
      throw new Error(`Missing enrichment or image for slug: ${service.slug}`);
    }

    const overview = uniqueByKey([...(service.overview || []), ...extra.overviewExtra], (p) => p);
    const faqs = uniqueByKey([...(service.faqs || []), ...extra.faqsExtra], (f) => f.q);

    updated += 1;
    return {
      ...service,
      image: imageMeta.image,
      imageAlt: imageMeta.imageAlt,
      imageCaption: extra.imageCaption || `DLSS support for ${service.navLabel.toLowerCase()}`,
      overview,
      highlights: extra.highlights,
      whoItsFor: extra.whoItsFor,
      outcomes: extra.outcomes,
      faqs,
    };
  });

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Enriched ${updated} services with images and expanded content.`);
}

main();
