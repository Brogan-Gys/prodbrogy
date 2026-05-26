export const SUBMISSION_EMAIL = process.env.NEXT_PUBLIC_SUBMISSION_EMAIL || "prodbrogy@gmail.com";

export function getSubmissionMailto() {
  const subject = "ProdBrogy submission";
  const body = [
    "Yo ProdBrogy,",
    "",
    "I made something with sounds from the vault.",
    "",
    "Name:",
    "Social handle:",
    "Which kit/sound did you use:",
    "Link or notes:",
    "",
    "I attached the beat/melody to this email."
  ].join("\n");

  return `mailto:${SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
