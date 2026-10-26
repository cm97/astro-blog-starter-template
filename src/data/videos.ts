export type ExplainerSlide = [string, string, string];

export type ExplainerVideo = {
	slug: string;
	title: string;
	description: string;
	seconds: number;
	poster: string;
	slides: ExplainerSlide[];
	script: string;
};

// What each explainer says on screen and reads aloud. It has to match the
// live store: the $49 Digital System is a browser app (no download), the
// $15/$19/$29 apps are "Coming soon" and already inside the $49 app, and the
// refund rule is the one in CLAUDE.md. No view counts or upload dates: there
// is no real audience data for these.
export const EXPLAINER_VIDEOS: ExplainerVideo[] = [
	{
		slug: "meet-buzzyfly",
		title: "Meet Buzzyfly — the $49 Digital System that holds a slammed week",
		description: "A browser app for coaches and solo service providers: who to follow up with today, the email to send, onboarding for new clients and your Monday reset. One-time $49. No download.",
		seconds: 32,
		poster: "/videos/meet-buzzyfly.svg",
		slides: [
			["SYSTEM", "$49 one-time", "A browser app. No download."],
			["TODAY", "Who needs you", "And the email to send."],
			["REFUND", "30 days", "If you can't get in or it isn't as described."],
		],
		script: "Buzzyfly is the forty-nine dollar Digital System. A web app that opens in your browser, on your phone or computer. It shows who to follow up with today and fills in the email. New clients get the same onboarding every time. One-time payment. Thirty-day refund if you can't get into the app or it isn't what the listing described.",
	},
	{
		slug: "whats-inside-the-app",
		title: "Inside the $49 app — Today, clients, emails, reset, pricing",
		description: "A tour of the Digital System's screens. Your data stays in your browser. No subscription.",
		seconds: 28,
		poster: "/videos/whats-in-the-zip.svg",
		slides: [
			["TODAY", "One screen", "Follow-ups and onboarding steps due."],
			["EMAILS", "Filled in for you", "Copy it, send it yourself."],
			["RESET", "Monday, 20 minutes", "Score your tasks. Pick your #1."],
		],
		script: "Inside the forty-nine dollar app. The Today screen shows the follow-ups and onboarding steps that are due. The email writer fills in each client's name and project, and you copy and send it yourself. The Monday reset takes twenty minutes and picks your number one task. One-time payment. No subscription.",
	},
	{
		slug: "weekly-reset",
		title: "Weekly Reset — a 20-minute Monday that still works by Thursday",
		description: "The Monday reset, a priority scorer, a Thursday check-in and a Friday close. Inside the $49 Digital System today. A $15 version is coming soon.",
		seconds: 30,
		poster: "/videos/weekly-reset.svg",
		slides: [
			["MONDAY", "20-minute reset", "Score tasks. Pick your #1."],
			["THURSDAY", "5-minute check", "Catch the week before it slips."],
			["INSIDE", "The $49 system", "A $15 version is coming soon."],
		],
		script: "The weekly reset. Twenty minutes on Monday to score your tasks and pick your number one. A five-minute check on Thursday, and a Friday close that goes into your weekly log. It's inside the forty-nine dollar Digital System today. A fifteen dollar version on its own is coming soon.",
	},
	{
		slug: "onboarding-kit",
		title: "Client onboarding — the same first ten days for every new client",
		description: "A 10-step plan for each new client, the welcome, intake and kickoff emails filled in, and your own intake questions. Inside the $49 Digital System today. A $29 version is coming soon.",
		seconds: 34,
		poster: "/videos/onboarding-kit.svg",
		slides: [
			["WEEK ONE", "10 steps", "Welcome. Intake. Kickoff."],
			["SAME", "Every client", "No rebuild from memory."],
			["INSIDE", "The $49 system", "A $29 version is coming soon."],
		],
		script: "Client onboarding. A ten-step plan for every new client, with the welcome, intake and kickoff emails filled in. You write your intake questions once and reuse them. It's inside the forty-nine dollar Digital System today. A twenty-nine dollar version on its own is coming soon.",
	},
	{
		slug: "follow-up-templates",
		title: "Follow-ups — who to nudge today and the email to send",
		description: "Follow-up dates worked out for leads, proposals and late invoices, with 9 follow-up emails filled in. Inside the $49 Digital System today. A $19 version is coming soon.",
		seconds: 26,
		poster: "/videos/follow-up-emails.svg",
		slides: [
			["FOLLOW-UP", "Dates worked out", "Quiet lead. Late invoice."],
			["SEND", "Filled in for you", "Copy it and send it."],
			["INSIDE", "The $49 system", "A $19 version is coming soon."],
		],
		script: "Follow-ups. The app works out who is due today, for quiet leads, proposals and late invoices, and fills in the email. You copy it and send it yourself. It's inside the forty-nine dollar Digital System today. A nineteen dollar version on its own is coming soon.",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
