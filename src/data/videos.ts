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
	script: string;
};

export const EXPLAINER_VIDEOS: ExplainerVideo[] = [
	{
		slug: "meet-buzzyfly",
		title: "Meet Buzzyfly — the $49 Digital System that holds a slammed week",
		description: "One-time zip: checklists, templates, scripts for onboarding, weekly reset, follow-ups.",
		views: "2.4K",
		date: "12 minutes ago",
		seconds: 32,
		src: "/videos/meet-buzzyfly.mp4",
		poster: "/videos/meet-buzzyfly.svg",
		slides: [
			["SYSTEM", "$49 one-time", "Zip of checklists, templates, scripts."],
			["HOLD", "Survives a slammed week", "Open the folder. Run the list."],
			["REFUND", "7-day on the system", "Files not as listed? Email for refund."],
		],
		script: "Buzzyfly is the forty-nine dollar Digital System. One-time payment. A zip with checklists, templates, and scripts. Onboarding, weekly reset, follow-ups. It holds when the week gets slammed. Seven-day refund if the files are not what the store lists.",
	},
	{
		slug: "whats-in-the-zip",
		title: "Inside the $49 zip — checklists / templates / scripts",
		description: "Three folders only. No subscription. Yours to keep.",
		views: "1.8K",
		date: "34 minutes ago",
		seconds: 28,
		src: "/videos/whats-in-the-zip.mp4",
		poster: "/videos/whats-in-the-zip.svg",
		slides: [
			["FOLDERS", "Three folders", "checklists / templates / scripts"],
			["RUN", "Tick and close", "Intake, reset, follow-up ready."],
			["KEEP", "One-time payment", "Download once. Use forever."],
		],
		script: "What is in the forty-nine dollar zip. Three folders: checklists, templates, scripts. Onboarding checklist, weekly reset, follow-up sequence. One-time payment. No subscription. Yours to keep.",
	},
	{
		slug: "weekly-reset",
		title: "Weekly Reset Checklist — $15 for a 20-minute Monday",
		description: "Same reset every Monday. Priority, inbox, week plan.",
		views: "956",
		date: "1 hour ago",
		seconds: 30,
		src: "/videos/weekly-reset.mp4",
		poster: "/videos/weekly-reset.svg",
		slides: [
			["MONDAY", "20-minute reset", "Clear inbox. Set one priority."],
			["SAME", "Every week", "No scramble. Same list."],
			["PRICE", "$15 one-time", "Checklist only. Included in the system."],
		],
		script: "The Weekly Reset is fifteen dollars. A twenty-minute Monday checklist. Clear the inbox, set the priority, plan the week the same way every time. One-time. Or get it inside the forty-nine dollar system.",
	},
	{
		slug: "onboarding-kit",
		title: "Client Onboarding Kit — $29 so week one is documented",
		description: "Welcome, intake, kickoff. Same sequence every new client.",
		views: "1.1K",
		date: "3 hours ago",
		seconds: 34,
		src: "/videos/onboarding-kit.mp4",
		poster: "/videos/onboarding-kit.svg",
		slides: [
			["WEEK ONE", "Documented", "Welcome email. Intake. Kickoff."],
			["SAME", "Every client", "No rebuild from memory."],
			["KIT", "$29 one-time", "Or inside the $49 system."],
		],
		script: "Client Onboarding Kit. Twenty-nine dollars. Welcome email, intake questions, kickoff agenda. Same process for every new client. One-time payment. Also inside the Digital System zip.",
	},
	{
		slug: "follow-up-templates",
		title: "Follow-Up Templates — $19, emails ready to send",
		description: "Five follow-up emails. Quiet leads and late invoices.",
		views: "742",
		date: "6 hours ago",
		seconds: 26,
		src: "/videos/follow-up-emails.mp4",
		poster: "/videos/follow-up-emails.svg",
		slides: [
			["FOLLOW-UP", "Ready emails", "Quiet lead. Late invoice."],
			["SEND", "Copy and send", "No blank next email."],
			["PRICE", "$19 one-time", "Templates only."],
		],
		script: "Follow-Up Templates. Nineteen dollars. Five emails ready to send for quiet leads and late invoices. One-time. Or get the full set in the forty-nine dollar Digital System.",
	},
	{
		slug: "complete-bundle",
		title: "Complete Bundle — $97, every product in one download",
		description: "Digital System + Onboarding Kit + Follow-Ups + Weekly Reset.",
		views: "1.5K",
		date: "1 day ago",
		seconds: 36,
		src: "/videos/complete-bundle.mp4",
		poster: "/videos/complete-bundle.svg",
		slides: [
			["BUNDLE", "$97 one-time", "All products in one zip."],
			["EVERY", "System + kits", "Onboarding, reset, follow-ups."],
			["KEEP", "Future updates", "One payment. All files."],
		],
		script: "The Complete Bundle is ninety-seven dollars. The Digital System plus the Onboarding Kit, Follow-Up Templates, and Weekly Reset. One download. One-time payment. Every file you need.",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
