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
		title: "Meet Buzzyfly — checklists that survive a slammed week",
		description: "Onboarding, weekly planning, and follow-ups as checklists you run in twenty minutes.",
		views: "8.3K",
		date: "1 hour ago",
		seconds: 36,
		src: "/videos/meet-buzzyfly.mp4",
		poster: "/videos/meet-buzzyfly.svg",
		slides: [
			["BUZZYFLY", "Meet Buzzyfly", "Onboarding · weekly reset · follow-ups."],
			["PROBLEM", "Still lives in your head", "New client. Same steps. Rebuilt every time."],
			["FIX", "Run the lists in 20 minutes", "Open. Tick. Close. Holds on busy weeks."],
		],
		script: "Running your freelance business out of your head is costing you clients. Buzzyfly is checklists for onboarding, weekly planning, and follow-ups. Same process every week. Every client. Nothing falls through the cracks. Get the Digital System at buzzyfly dot com. Forty-nine dollars, one time.",
	},
	{
		slug: "whats-in-the-zip",
		title: "Inside the $49 Digital System — checklists, templates, scripts",
		description: "Three folders: checklists, templates, scripts. That is the product.",
		views: "6.7K",
		date: "3 hours ago",
		seconds: 34,
		src: "/videos/whats-in-the-zip.mp4",
		poster: "/videos/whats-in-the-zip.svg",
		slides: [
			["ZIP", "Three folders only", "checklists / templates / scripts"],
			["CHECKLISTS", "Onboard. Reset. Follow up.", "Intake, scope-creep, retention included."],
			["TEMPLATES", "Proposal. Emails. Say-no lines.", "Fill blanks. Send. Keep the scope."],
		],
		script: "Here is exactly what is in the forty-nine dollar Digital System. Three folders: checklists, templates, and scripts. An onboarding checklist, a weekly reset, a follow-up sequence, and a proposal template. Everything to run a client business without improvising from memory. One download. Yours forever. Forty-nine dollars at buzzyfly dot com.",
	},
	{
		slug: "how-to-use",
		title: "Day-one setup: pay, unzip, run the first checklist",
		description: "Pay. Inbox. Unzip. Run the list. Do not rebuild Monday.",
		views: "5.4K",
		date: "5 hours ago",
		seconds: 34,
		src: "/videos/how-to-use.mp4",
		poster: "/videos/how-to-use.svg",
		slides: [
			["HOW", "Pay. Inbox. Unzip.", "Stripe. Private link. One-time payment."],
			["FOLDERS", "Match folder to the job", "checklists to run, templates to send."],
			["RUN", "Do not rebuild Monday", "Tick the list. Send the template. Move on."],
		],
		script: "Most people buy systems and never open them. Here is how to use Buzzyfly the day you buy it. Pay — download link arrives in your email — unzip — open the onboarding checklist — run it with your next client. That is the whole setup. Stop rebuilding your process from scratch. Start at buzzyfly dot com.",
	},
	{
		slug: "advantages",
		title: "Why the Digital System is $49 one-time (not a subscription)",
		description: "Onboarding leaves your head. Follow-ups actually get sent.",
		views: "10.4K",
		date: "3 days ago",
		seconds: 36,
		src: "/videos/advantages.mp4",
		poster: "/videos/advantages.svg",
		slides: [
			["WHY", "Onboarding leaves your head", "Same steps every new client."],
			["FOLLOW-UPS", "They actually get sent", "Five ready emails. Name in. Send."],
			["PRICE", "Digital System $49 one-time", "Download after purchase."],
		],
		script: "Why forty-nine dollars one time instead of a monthly subscription? Because it is files. Checklists and templates you download, keep, and use forever. No login, no renewal. Your onboarding process leaves your head. Your follow-ups actually get sent. Forty-nine dollars at buzzyfly dot com. One time.",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
