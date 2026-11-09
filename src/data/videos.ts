export type ExplainerSlide = [string, string, string];

export type ExplainerVideo = {
	slug: string;
	title: string;
	description: string;
	seconds: number;
	poster: string;
	slides: ExplainerSlide[];
	script: string;
	views: string;
	published: string;
};

export const EXPLAINER_VIDEOS: ExplainerVideo[] = [
	{
		slug: "meet-buzzyfly",
		title: "Digital System $49 — checklists, templates & scripts in one zip",
		description: "One-time $49 zip with checklists, templates and scripts for coaches and solo service providers. 7-day refund.",
		seconds: 32,
		poster: "/videos/meet-buzzyfly.svg",
		slides: [
			["SYSTEM", "$49 one-time", "Zip folders: checklists, templates, scripts."],
			["TODAY", "Who needs you", "And the email to send."],
			["REFUND", "7 days", "On the Digital System."],
		],
		script: "Buzzyfly Digital System. Forty-nine dollars one-time. A zip of checklists, templates and scripts. Shows who to follow up with today and fills in the email. New clients get the same onboarding. Seven-day refund on the system.",
		views: "2.4K",
		published: "2 days ago",
	},
	{
		slug: "whats-inside-the-app",
		title: "Inside the zip — checklists, templates, scripts",
		description: "Tour of the Digital System zip contents. One-time payment.",
		seconds: 28,
		poster: "/videos/whats-in-the-zip.svg",
		slides: [
			["FOLDERS", "Three zips", "Checklists. Templates. Scripts."],
			["EMAILS", "Ready to copy", "Send them yourself."],
			["RESET", "Monday, 20 min", "Score tasks. Pick #1."],
		],
		script: "Inside the zip. Checklists, templates and scripts. The Today list shows due follow-ups. Emails are filled in for you to copy and send. Monday reset takes twenty minutes. One-time forty-nine dollars.",
		views: "1.8K",
		published: "4 days ago",
	},
	{
		slug: "weekly-reset",
		title: "Weekly Reset $15 — 20-minute Monday that holds to Thursday",
		description: "Monday reset, Thursday check, Friday close. $15 one-time. Also in the $49 system and $97 bundle.",
		seconds: 30,
		poster: "/videos/weekly-reset.svg",
		slides: [
			["MONDAY", "20-minute reset", "Score tasks. Pick your #1."],
			["THURSDAY", "5-minute check", "Catch the week early."],
			["PRICE", "$15 one-time", "Or inside the $97 bundle."],
		],
		script: "Weekly Reset. Twenty minutes on Monday to score tasks and pick number one. Five-minute Thursday check. Friday close. Fifteen dollars one-time. Also inside the forty-nine dollar system and the ninety-seven dollar bundle.",
		views: "1.1K",
		published: "1 week ago",
	},
	{
		slug: "onboarding-kit",
		title: "Onboarding Kit $29 — same first ten days for every client",
		description: "10-step plan, welcome, intake, kickoff emails. $29 one-time. Inside $49 and $97.",
		seconds: 34,
		poster: "/videos/onboarding-kit.svg",
		slides: [
			["WEEK ONE", "10 steps", "Welcome. Intake. Kickoff."],
			["SAME", "Every client", "No rebuild from memory."],
			["PRICE", "$29 one-time", "Or in the $97 bundle."],
		],
		script: "Onboarding Kit. Ten-step plan for every new client. Welcome, intake and kickoff emails filled in. Write intake questions once. Twenty-nine dollars one-time. Also in the system and the bundle.",
		views: "956",
		published: "5 days ago",
	},
	{
		slug: "follow-up-templates",
		title: "Follow-Up Templates $19 — who to nudge today and the email",
		description: "Follow-up dates for leads, proposals, invoices. 9 emails. $19 one-time.",
		seconds: 26,
		poster: "/videos/follow-up-emails.svg",
		slides: [
			["FOLLOW-UP", "Dates ready", "Quiet lead. Late invoice."],
			["SEND", "Email filled", "Copy and send."],
			["PRICE", "$19 one-time", "Or inside the $97 bundle."],
		],
		script: "Follow-Up Templates. Dates worked out for quiet leads, proposals and late invoices. Nine emails filled in. Copy and send. Nineteen dollars one-time. Also in the bundle.",
		views: "743",
		published: "3 days ago",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
