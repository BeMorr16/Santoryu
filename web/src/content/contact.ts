/** Contact page copy. Edit freely; the page and its metadata read from here. */
export const contactContent = {
  heading: "Contact",
  location: "Based in Boston, MA · Open to remote, hybrid or on-site",
  invitation:
    "If you have a role that might fit, or a project you'd like to collaborate on, I'd love to hear from you.",
  linkedinLabel: "LinkedIn",
  githubLabel: "GitHub",
  description:
    "Send Ben Morrison, a full stack software engineer, a message, or connect on LinkedIn or GitHub.",
} as const;

/** A sentence with a link in it, so "LinkedIn" can be a real link. */
export interface LinkedSentence {
  before: string;
  linkLabel: string;
  after: string;
}

/** Contact form copy (contact-form "Copy"). Field names and error codes match the API's. */
export const contactFormContent = {
  heading: "Send a message",
  labels: {
    name: "Name",
    email: "Email",
    subject: "Role or company",
    message: "Message",
  },
  submit: "Send message",
  sending: "Sending…",
  privacy:
    "Your message goes to my inbox and isn't stored on this site. Cloudflare Turnstile helps block bots, and it receives your IP address.",
  successHeading: "Message sent",
  successText: "Thanks for reaching out. I'll reply by email.",
  sendAnother: "Send another message",
  noScript: "The form needs JavaScript. You can still reach me on LinkedIn or GitHub above.",
  errors: {
    name: {
      missing: "Enter your name.",
      tooLong: "Keep your name to 100 characters or fewer.",
      invalid: "Your name has a character that can't be sent. Try retyping it.",
    },
    email: {
      missing: "Enter your email address.",
      tooLong: "Enter a valid email address, like name@example.com.",
      invalid: "Enter a valid email address, like name@example.com.",
    },
    subject: {
      tooLong: "Keep this to 100 characters or fewer.",
      invalid: "This has a character that can't be sent. Try retyping it.",
    },
    message: {
      missing: "Enter a message.",
      tooLong: "Keep your message to 5,000 characters or fewer.",
    },
  },
  sendFailed: {
    before:
      "Your message couldn't be sent. Your text is still here, so try again, or message me on ",
    linkLabel: "LinkedIn",
    after: ".",
  },
  challengeFailed: {
    before: "We couldn't confirm you're not a bot. Try again, or message me on ",
    linkLabel: "LinkedIn",
    after: ".",
  },
} as const satisfies {
  sendFailed: LinkedSentence;
  challengeFailed: LinkedSentence;
  [slot: string]: unknown;
};
