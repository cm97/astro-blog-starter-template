export type ExplainerSlide = [string, string, string];

export type ExplainerVideo = {
	slug: string;
	title: string;
	description: string;
	views: string;
	date: string;
	seconds: number;
	src: string;
	poster: string;
	slides: ExplainerSlide[];
};

export const EXPLAINER_VIDEOS: ExplainerVideo[] = [
	{
		slug: "meet-buzzyfly",
		title: "Meet Buzzyfly — the 20-minute operating system for client work",
		description: "Onboarding, weekly planning, and follow-ups as checklists you run in twenty minutes.",
		views: "4.1K",
		date: "4 hours ago",
		seconds: 36,
		src: "/videos/meet-buzzyfly.mp4",
		poster: "/videos/meet-buzzyfly.svg",
		slides: [
			["BUZZYFLY", "Meet Buzzyfly", "Onboarding, weekly planning, follow-ups."],
			["PROBLEM", "It still lives in your head", "New client. Same steps. Rebuilt from memory every time."],
			["FIX", "Run the checklists in 20 minutes", "Open. Tick. Close. The process stays on the hard weeks."],
		],
	},
	{
		slug: "whats-in-the-zip",
		title: "What is actually inside the $49 Digital System zip",
		description: "Three folders: checklists, templates, scripts.",
		views: "3.3K",
		date: "7 hours ago",
		seconds: 34,
		src: "/videos/whats-in-the-zip.mp4",
		poster: "/videos/whats-in-the-zip.svg",
		slides: [
			["ZIP", "Three folders. That is the product.", "checklists / templates / scripts"],
			["CHECKLISTS", "Onboard. Weekly reset. Follow up.", "Intake, scope-creep, retention included."],
			["TEMPLATES", "Proposal. Emails. Say-no lines.", "Fill blanks. Send. Keep the scope."],
		],
	},
	{
		slug: "how-to-use",
		title: "How to use Buzzyfly the day after you buy",
		description: "Pay. Inbox. Unzip. Run the list. Do not rebuild Monday.",
		views: "2.6K",
		date: "11 hours ago",
		seconds: 34,
		src: "/videos/how-to-use.mp4",
		poster: "/videos/how-to-use.svg",
		slides: [
			["HOW", "Pay. Inbox. Unzip.", "Stripe. Private download link good for 3 days."],
			["FOLDERS", "Match the folder to the job", "checklists for the run, templates for the send."],
			["RUN", "Do not rebuild Monday", "Tick the list. Send the template. Move on."],
		],
	},
	{
		slug: "weekly-reset",
		title: "Weekly Reset Checklist — $15 for a 20-minute Monday",
		description: "Clear inbox. Set one priority. Plan the week.",
		views: "5.7K",
		date: "1 day ago",
		seconds: 30,
		src: "/videos/weekly-reset.mp4",
		poster: "/videos/weekly-reset.svg",
		slides: [
			["$15", "Weekly Reset Checklist", "The 20-minute Monday routine."],
			["YOU GET", "Reset + one priority + Thursday check-in", "Plus the inbox-clearing routine."],
			["RESULT", "Same way every week", "Clear inbox. Set one priority. Plan the week."],
		],
	},
	{
		slug: "onboarding-kit",
		title: "Client Onboarding Kit — $29 so week one is documented",
		description: "Welcome, intake, kickoff agenda, notes format.",
		views: "4.0K",
		date: "2 days ago",
		seconds: 30,
		src: "/videos/onboarding-kit.mp4",
		poster: "/videos/onboarding-kit.svg",
		slides: [
			["$29", "Client Onboarding Kit", "New client without improvising week one."],
			["YOU GET", "Welcome. Intake. Kickoff agenda.", "Notes format + 48-hour reminder."],
			["RESULT", "Week one is documented", "Same welcome sequence every client."],
		],
	},
	{
		slug: "follow-up-emails",
		title: "Follow-Up Templates — $19, five emails ready to send",
		description: "Fill a name. Hit send. Pipeline stays alive.",
		views: "2.9K",
		date: "3 days ago",
		seconds: 28,
		src: "/videos/follow-up-emails.mp4",
		poster: "/videos/follow-up-emails.svg",
		slides: [
			["$19", "Five ready-to-send follow-ups", "Fill a name. Hit send."],
			["THE SET", "Proposal 5–7 days. Mid-project. Quiet leads.", "Referral. End-of-project wrap-up."],
			["POINT", "Pipeline dies without follow-up", "These keep the follow-up happening."],
		],
	},
	{
		slug: "advantages",
		title: "Why the Digital System is $49 one-time",
		description: "Onboarding leaves your head. Follow-ups actually get sent.",
		views: "6.8K",
		date: "4 days ago",
		seconds: 36,
		src: "/videos/advantages.mp4",
		poster: "/videos/advantages.svg",
		slides: [
			["WHY", "Onboarding leaves your head", "Same steps every new client."],
			["FOLLOW-UPS", "They actually get sent", "Five ready emails. Name in. Send."],
			["PRICE", "Digital System $49 one-time", "7-day refund if the files are not what the store lists."],
		],
	},
	{
		slug: "complete-bundle",
		title: "Complete Bundle — $97, every Buzzyfly product",
		description: "System + Onboarding Kit + Follow-ups + Weekly Reset.",
		views: "5.1K",
		date: "5 days ago",
		seconds: 32,
		src: "/videos/complete-bundle.mp4",
		poster: "/videos/complete-bundle.svg",
		slides: [
			["BUNDLE", "$97 Complete Bundle", "System + Onboarding Kit + Follow-ups + Weekly Reset."],
			["ONE PAY", "One-time. No subscription.", "Lifetime product updates included."],
			["OR", "Digital System alone is $49", "Onboarding, weekly planning, follow-up workflows."],
		],
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
