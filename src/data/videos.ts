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
];
// Removed "how-to-use" (its audio promises the download by email) and "advantages"
// (its audio promises a 7-day refund). Re-record before adding them back.

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
