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
		slug: "weekly-reset",
		title: "Weekly Reset Checklist — $15 for a 20-minute Monday",
		description: "Clear inbox. Set one priority. Plan the week the same way every time.",
		views: "9.1K",
		date: "18 minutes ago",
		seconds: 32,
		src: "/videos/weekly-reset.mp4",
		poster: "/videos/weekly-reset.svg",
		slides: [
			["$15", "Weekly Reset Checklist", "20-minute Monday. Same way every week."],
			["YOU GET", "Reset + priority + mid-week", "Inbox clear. One priority. Plan set."],
			["RESULT", "Week holds on busy days", "Open the list. Tick. Close."],
		],
		script: "Every Monday should start the same way. Twenty minutes. Clear the inbox to zero action items. Set one priority. Plan the week. The Weekly Reset Checklist holds the structure so a slammed Thursday still has the list. Fifteen dollars. One-time at buzzyfly dot com.",
	},
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
		slug: "onboarding-kit",
		title: "Client Onboarding Kit — $29 so week one is documented",
		description: "Welcome, intake, kickoff agenda, notes format. Same sequence every new client.",
		views: "7.2K",
		date: "1 day ago",
		seconds: 30,
		src: "/videos/onboarding-kit.mp4",
		poster: "/videos/onboarding-kit.svg",
		slides: [
			["$29", "Client Onboarding Kit", "New client without improvising week one."],
			["YOU GET", "Welcome. Intake. Kickoff agenda.", "Notes format + 48-hour reminder."],
			["RESULT", "Week one is documented", "Same sequence every new client."],
		],
		script: "Week one with a new client should not feel improvised. The Client Onboarding Kit gives you a welcome email, intake form, kickoff agenda, and notes format — everything to start the relationship professionally. Same sequence every new client, from day one. Twenty-nine dollars at buzzyfly dot com.",
	},
	{
		slug: "follow-up-emails",
		title: "Follow-Up Templates — $19, five emails ready to send",
		description: "Fill a name. Hit send. Pipeline stays alive.",
		views: "5.8K",
		date: "2 days ago",
		seconds: 28,
		src: "/videos/follow-up-emails.mp4",
		poster: "/videos/follow-up-emails.svg",
		slides: [
			["$19", "Five ready-to-send follow-ups", "Fill a name. Hit send."],
			["THE SET", "Proposal 5–7 days. Mid-project. Quiet leads.", "Referral. End-of-project wrap-up."],
			["POINT", "Pipeline dies without follow-up", "These keep it moving."],
		],
		script: "Most proposals die because nobody followed up. Five ready-to-send emails: proposal follow-up, mid-project check-in, quiet leads, referral ask, and project wrap-up. Fill in a name. Hit send. Keep the pipeline alive. Nineteen dollars at buzzyfly dot com.",
	},
	{
		slug: "advantages",
		title: "Why the Digital System is $49 one-time (not a subscription)",
		description: "Onboarding leaves your head. Follow-ups actually get sent. 7-day refund.",
		views: "10.4K",
		date: "3 days ago",
		seconds: 36,
		src: "/videos/advantages.mp4",
		poster: "/videos/advantages.svg",
		slides: [
			["WHY", "Onboarding leaves your head", "Same steps every new client."],
			["FOLLOW-UPS", "They actually get sent", "Five ready emails. Name in. Send."],
			["PRICE", "Digital System $49 one-time", "7-day refund on the system."],
		],
		script: "Why forty-nine dollars one time instead of a monthly subscription? Because it is files. Checklists and templates you download, keep, and use forever. No login, no renewal. Your onboarding process leaves your head. Your follow-ups actually get sent. Forty-nine dollars at buzzyfly dot com. One time. 7-day refund on the system.",
	},
	{
		slug: "complete-bundle",
		title: "Complete Bundle — $97, every Buzzyfly product in one download",
		description: "System + Onboarding Kit + Follow-ups + Weekly Reset. One-time.",
		views: "8.9K",
		date: "4 days ago",
		seconds: 32,
		src: "/videos/complete-bundle.mp4",
		poster: "/videos/complete-bundle.svg",
		slides: [
			["BUNDLE", "$97 Complete Bundle", "System + Onboarding + Follow-ups + Weekly Reset."],
			["ONE PAY", "One-time. No subscription.", "Lifetime product updates included."],
			["OR", "Digital System alone is $49", "Onboarding, weekly planning, follow-up workflows."],
		],
		script: "If you are serious about running a tight solo business, the Complete Bundle has everything. Digital System, Client Onboarding Kit, Follow-Up Templates, and Weekly Reset Checklist. All four products. One download. Lifetime updates included. Ninety-seven dollars at buzzyfly dot com. One-time payment.",
	},
];

export function getVideo(slug: string) {
	return EXPLAINER_VIDEOS.find((v) => v.slug === slug) ?? null;
}

export function fmtTime(s: number) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
