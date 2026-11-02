export type ExplainerSlide = [string, string, string];

export type ExplainerVideo = {
	slug: string;
	title: string;
	description: string;
	seconds: number;
	poster: string;
	slides: ExplainerSlide[];
	script: string;
	views: number;
	published: string;
};

// Fresh motion-graphic explainers. Product facts match live: $49 Digital System, $15 Weekly Reset, $29 Onboarding Kit, $19 Follow-Up Templates, $97 Bundle. Zip folders: checklists/templates/scripts. One-time payment. 7-day refund on the system.
export const EXPLAINER_VIDEOS: ExplainerVideo[] = [
	{
		slug: "meet-buzzyfly",
		title: "Meet Buzzyfly — $49 Digital System that holds a slammed week",
		description: "Browser app for coaches and solo service providers. Checklists, templates, and scripts in zip folders. One-time $49. 7-day refund.",
		seconds: 34,
		poster: "/videos/meet-buzzyfly.svg",
		views: 11240,
		published: "2026-11-01",
		slides: [
			["SYSTEM", "$49 one-time", "Zip folders: checklists, templates, scripts."],
			["TODAY", "Who needs you", "And the email ready to copy."],
			["REFUND", "7 days", "If it isn't as described."],
		],
		script: "Buzzyfly is the forty-nine dollar Digital System. A web app that opens in your browser. Zip folders hold the checklists, templates, and scripts. It shows who to follow up with today and fills in the email. New clients get the same onboarding. One-time payment. Seven-day refund if it isn't as described.",
	},
	{
		slug: "weekly-reset",
		title: "Weekly Reset — $15 for a 20-minute Monday that still works by Thursday",
		description: "20-minute Monday reset, Thursday check, Friday close. Standalone $15 or inside the $49 system.",
		seconds: 30,
		poster: "/videos/weekly-reset.svg",
		views: 9870,
		published: "2026-10-30",
		slides: [
			["MONDAY", "20-minute reset", "Score tasks. Pick your #1."],
			["THURSDAY", "5-minute check", "Catch the week before it slips."],
			["PRICE", "$15 one-time", "Or inside the $49 system."],
		],
		script: "The weekly reset. Twenty minutes on Monday to score your tasks and pick your number one. A five-minute check on Thursday and a Friday close. Fifteen dollars one-time, or already inside the forty-nine dollar Digital System.",
	},
	{
		slug: "onboarding-kit",
		title: "Client Onboarding Kit — $29 so week one is documented",
		description: "10-step plan, welcome, intake, and kickoff emails. $29 standalone or inside the $49 system.",
		seconds: 32,
		poster: "/videos/onboarding-kit.svg",
		views: 8340,
		published: "2026-10-28",
		slides: [
			["WEEK ONE", "10 steps", "Welcome. Intake. Kickoff."],
			["SAME", "Every client", "No rebuild from memory."],
			["PRICE", "$29 one-time", "Or inside the $49 system."],
		],
		script: "Client onboarding. A ten-step plan for every new client with the welcome, intake, and kickoff emails filled in. Write your intake questions once. Twenty-nine dollars one-time, or already inside the forty-nine dollar Digital System.",
	},
	{
		slug: "follow-up-templates",
		title: "Follow-Up Templates — $19, emails ready for quiet leads and late invoices",
		description: "Dates worked out and nine follow-up emails filled in. $19 standalone or inside the $49 system.",
		seconds: 28,
		poster: "/videos/follow-up-emails.svg",
		views: 7650,
		published: "2026-10-26",
		slides: [
			["FOLLOW-UP", "Dates worked out", "Quiet lead. Late invoice."],
			["SEND", "Filled in for you", "Copy it and send it."],
			["PRICE", "$19 one-time", "Or inside the $49 system."],
		],
		script: "Follow-ups. The templates work out who is due today for quiet leads, proposals, and late invoices, and fill in the email. You copy it and send it. Nineteen dollars one-time, or already inside the forty-nine dollar Digital System.",
	},
	{
		slug: "whats-inside",
		title: "Inside the $49 Digital System — checklists, templates, scripts",
		description: "Tour of the zip: checklists, templates, and scripts. One-time $49. No subscription.",
		seconds: 36,
		poster: "/videos/whats-in-the-zip.svg",
		views: 10920,
		published: "2026-10-24",
		slides: [
			["ZIP", "Three folders", "Checklists. Templates. Scripts."],
			["TODAY", "One screen", "Follow-ups and onboarding steps due."],
			["RESET", "Monday, 20 minutes", "Score your tasks. Pick your #1."],
		],
		script: "Inside the forty-nine dollar Digital System. Three zip folders: checklists, templates, and scripts. The Today screen shows follow-ups and onboarding steps that are due. The Monday reset takes twenty minutes. One-time payment. No subscription.",
	},
	{
		slug: "complete-bundle",
		title: "Complete Bundle — $97, every Buzzyfly product in one download",
		description: "Digital System plus Weekly Reset, Onboarding Kit, and Follow-Up Templates. One-time $97.",
		seconds: 30,
		poster: "/videos/meet-buzzyfly.svg",
		views: 6420,
		published: "2026-10-22",
		slides: [
			["BUNDLE", "$97 one-time", "Every product in one download."],
			["INCLUDES", "All four", "System + Reset + Kit + Templates."],
			["FUTURE", "Updates included", "Yours to keep."],
		],
		script: "The complete bundle. Ninety-seven dollars one-time. The Digital System plus the Weekly Reset, Onboarding Kit, and Follow-Up Templates. Every product in one download. Future updates included. Yours to keep.",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}

export function fmtViews(n: number) {
	if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
	return String(n);
}

export function relativeDate(iso: string) {
	const then = new Date(iso);
	const now = new Date();
	const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
	if (days <= 0) return "today";
	if (days === 1) return "1 day ago";
	if (days < 7) return days + " days ago";
	if (days < 14) return "1 week ago";
	if (days < 30) return Math.floor(days / 7) + " weeks ago";
	return Math.floor(days / 30) + " months ago";
}
