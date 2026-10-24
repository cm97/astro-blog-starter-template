/**
 * The Buzzyfly web apps. Plain DOM code, no framework. All data lives in this
 * browser's localStorage. Backup / Restore move it between devices as a JSON
 * file.
 *
 * One script serves every edition, set by <body data-edition>: the Digital
 * System (/app, every screen), the Weekly Reset (/app/reset, the weekly
 * screens), Follow-Ups (/app/follow-ups, clients and follow-up emails) and
 * Onboarding (/app/onboarding, the new-client plan and its emails).
 * They share one store, so upgrading keeps everything.
 */
import {
	FOLLOW_UPS,
	INTAKE_QUESTIONS,
	ONBOARDING_STEPS,
	RESET_STEPS,
	STAGES,
	TEMPLATES,
	type StageId,
	type Template,
} from "../data/appContent";

interface Client {
	id: string;
	name: string;
	email: string;
	project: string;
	amount: string;
	stage: StageId;
	stageDate: string;
	notes: string;
	/** `${stage}:${templateId}` → date the follow-up was marked sent. */
	sent: Record<string, string>;
	onboarding: Record<string, boolean>;
}

interface Task {
	id: string;
	text: string;
	money: number;
	urgency: number;
	effort: number;
}

interface Pricing {
	income: number;
	expenses: number;
	weeks: number;
	hours: number;
	buffer: number;
	projectHours: number;
	retainerHours: number;
}

/** One week's Thursday check-in and Friday close, keyed by ISO week in State.log. */
interface WeekLog {
	top: string;
	onTrack: "" | "yes" | "no";
	blocker: string;
	drop: string;
	done: "" | "yes" | "no";
	money: number | null;
	hours: number | null;
	wins: string;
	slipped: string;
	next: string;
}

/** An email the buyer wrote and saved. Same {placeholders} as the built-in ones. */
interface CustomTemplate {
	id: string;
	label: string;
	subject: string;
	body: string;
}

interface State {
	v: 1;
	me: string;
	clients: Client[];
	reset: { week: string; done: Record<string, boolean>; tasks: Task[] };
	pricing: Pricing;
	log: Record<string, WeekLog>;
	custom: CustomTemplate[];
	/** The buyer's intake questions, or null for the defaults. */
	intake: string[] | null;
}

type View = "today" | "clients" | "emails" | "reset" | "week" | "log" | "pricing" | "settings";

const STORAGE_KEY = "buzzyfly-app-v1";
type Edition = "system" | "reset" | "followups" | "onboarding";
const EDITION: Edition =
	(["reset", "followups", "onboarding"] as const).find((e) => e === document.body.dataset.edition) ?? "system";
const EDITION_VIEWS: Record<Edition, View[]> = {
	system: ["today", "clients", "emails", "reset", "week", "log", "pricing", "settings"],
	reset: ["reset", "week", "log", "settings"],
	followups: ["today", "clients", "emails", "settings"],
	onboarding: ["today", "clients", "emails", "settings"],
};
/** Which parts of the client screens this edition shows. */
const SHOWS_FOLLOW_UPS = EDITION === "system" || EDITION === "followups";
const SHOWS_ONBOARDING = EDITION === "system" || EDITION === "onboarding";
const VIEWS = EDITION_VIEWS[EDITION];
/** The built-in emails this edition offers. The smaller apps get their own group only. */
const BUILT_IN =
	EDITION === "followups"
		? TEMPLATES.filter((t) => t.group === "Follow-ups")
		: EDITION === "onboarding"
			? TEMPLATES.filter((t) => t.group === "Onboarding")
			: TEMPLATES;
const CUSTOM_GROUP = "Your emails";
const HOME: View = VIEWS[0];

// ---------- dates ----------

function todayIso(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(iso: string, days: number): string {
	const d = parseIso(iso);
	d.setDate(d.getDate() + days);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(iso: string, today = todayIso()): number {
	return Math.round((parseIso(today).getTime() - parseIso(iso).getTime()) / 86_400_000);
}

function fmtDate(iso: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
	return parseIso(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isoWeek(iso = todayIso()): string {
	const d = parseIso(iso);
	const day = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - day + 3);
	const firstThursday = new Date(d.getFullYear(), 0, 4);
	const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
	return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ---------- state ----------

function defaultState(): State {
	return {
		v: 1,
		me: "",
		clients: [],
		reset: { week: isoWeek(), done: {}, tasks: [] },
		pricing: { income: 60000, expenses: 6000, weeks: 46, hours: 20, buffer: 20, projectHours: 15, retainerHours: 10 },
		log: {},
		custom: [],
		intake: null,
	};
}

function isState(value: unknown): value is State {
	const s = value as State;
	return !!s && s.v === 1 && Array.isArray(s.clients) && !!s.reset && !!s.pricing;
}

function load(): State {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (isState(parsed)) return { ...defaultState(), ...parsed };
		}
	} catch {
		// Private mode or corrupt data: start fresh rather than break the app.
	}
	return defaultState();
}

let state = load();
let saveFailed = false;

function save(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		saveFailed = false;
	} catch {
		saveFailed = true;
	}
}

/** A new week clears the reset checklist but keeps unfinished tasks. The old week's #1 stays in the log. */
function rollWeek(): void {
	const week = isoWeek();
	if (state.reset.week !== week) {
		const top = topTask();
		if (top && !weekLog(state.reset.week).top) weekLog(state.reset.week).top = top.text;
		state.reset = { week, done: {}, tasks: state.reset.tasks };
		save();
	}
}

function emptyWeek(): WeekLog {
	return { top: "", onTrack: "", blocker: "", drop: "", done: "", money: null, hours: null, wins: "", slipped: "", next: "" };
}

/** This week's log entry, created on first use. */
function weekLog(week = isoWeek()): WeekLog {
	state.log[week] ??= emptyWeek();
	return state.log[week];
}

function uid(): string {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- logic ----------

function esc(value: unknown): string {
	return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function stageLabel(id: StageId): string {
	return STAGES.find((s) => s.id === id)?.label ?? id;
}

function template(id: string): Pick<Template, "id" | "label" | "subject" | "body"> | undefined {
	return TEMPLATES.find((t) => t.id === id) ?? state.custom.find((t) => t.id === id);
}

interface DueFollowUp {
	client: Client;
	key: string;
	template: string;
	label: string;
	dueOn: string;
}

/** The follow-up due now for a client (the latest step whose day has passed and wasn't sent), if any. */
function dueFollowUp(client: Client, today = todayIso()): DueFollowUp | null {
	const since = daysSince(client.stageDate, today);
	const steps = FOLLOW_UPS[client.stage];
	const lastSentDay = Math.max(-1, ...steps.filter((s) => client.sent[`${client.stage}:${s.template}`]).map((s) => s.day));
	const passed = steps.filter((s) => s.day <= since && s.day > lastSentDay);
	const step = passed[passed.length - 1];
	if (!step) return null;
	return { client, key: `${client.stage}:${step.template}`, template: step.template, label: step.label, dueOn: addDays(client.stageDate, step.day) };
}

/** The next follow-up still to come for a client, if any. */
function nextFollowUp(client: Client, today = todayIso()): { label: string; dueOn: string } | null {
	const since = daysSince(client.stageDate, today);
	const step = FOLLOW_UPS[client.stage].find((s) => s.day > since && !client.sent[`${client.stage}:${s.template}`]);
	return step ? { label: step.label, dueOn: addDays(client.stageDate, step.day) } : null;
}

function dueOnboarding(client: Client, today = todayIso()) {
	if (client.stage !== "active") return [];
	const since = daysSince(client.stageDate, today);
	return ONBOARDING_STEPS.filter((s) => s.day <= since && !client.onboarding[s.id]);
}

function taskScore(t: Task): number {
	return t.money * 2 + t.urgency - t.effort;
}

function topTask(): Task | undefined {
	return [...state.reset.tasks].sort((a, b) => taskScore(b) - taskScore(a))[0];
}

function fill(text: string, client: Client | undefined): string {
	const name = client?.name.trim() ?? "";
	const values: Record<string, string> = {
		first: name ? name.split(/\s+/)[0] : "[name]",
		name: name || "[name]",
		project: client?.project.trim() || "[project]",
		amount: client?.amount.trim() || "[amount]",
		date: client?.stageDate ? fmtDate(client.stageDate) : "[date]",
		start: client?.stage === "active" && client.stageDate ? fmtDate(client.stageDate) : "[start date]",
		me: state.me.trim() || "[your name]",
	};
	const questions = (state.intake ?? INTAKE_QUESTIONS).map((q, i) => `${i + 1}. ${q}`).join("\n");
	return text
		.replace(/\{questions\}/g, questions)
		.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function money(amount: string): number {
	const n = Number(amount.replace(/[^0-9.]/g, ""));
	return Number.isFinite(n) ? n : 0;
}

function currency(n: number): string {
	return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ---------- views ----------

let view: View = HOME;
let selectedClientId: string | null = null;
let editingClientId: string | null = null;
let editingTemplateId: string | null = null;
let email: { clientId: string; templateId: string; followUpKey: string | null; onboardingStep: string | null } = {
	clientId: "",
	templateId: BUILT_IN[0].id,
	followUpKey: null,
	onboardingStep: null,
};

function emptyNote(text: string, action?: { label: string; view: View }): string {
	return `<div class="empty"><p>${esc(text)}</p>${action ? `<button class="btn" data-go="${action.view}">${esc(action.label)}</button>` : ""}</div>`;
}

function renderToday(): string {
	const today = todayIso();
	const followUps = SHOWS_FOLLOW_UPS ? state.clients.map((c) => dueFollowUp(c, today)).filter((f): f is DueFollowUp => !!f) : [];
	const onboarding = SHOWS_ONBOARDING ? state.clients.flatMap((c) => dueOnboarding(c, today).map((step) => ({ client: c, step }))) : [];
	const top = topTask();
	const soon = (SHOWS_FOLLOW_UPS ? state.clients : [])
		.map((c) => ({ client: c, next: nextFollowUp(c, today) }))
		.filter((x) => x.next && daysSince(today, x.next.dueOn) <= 7)
		.sort((a, b) => a.next!.dueOn.localeCompare(b.next!.dueOn));

	if (!state.clients.length) {
		return `<section class="card hero"><h2>Start here</h2><p>${
			EDITION === "onboarding"
				? "Add a client who just signed. The app lays out their first ten days, shows what's due, and writes each email."
				: "Add the leads, proposals and clients you're working with. The app works out who needs a follow-up and when, and writes the email."
		}</p><button class="btn" data-action="new-client">Add your first client</button></section>
		${!state.me ? `<section class="card"><h3>Your sign-off</h3><p class="muted">Emails end with your name.</p><form data-form="me" class="row"><label class="grow"><span class="sr">Your name</span><input name="me" placeholder="Your name" autocomplete="name" required></label><button class="btn">Save</button></form></section>` : ""}`;
	}

	return `
	${
		EDITION === "system"
			? `<section class="card priority"><p class="eyebrow">This week's #1</p>${
					top ? `<h2>${esc(top.text)}</h2>` : `<p>No priority picked yet.</p><button class="btn btn-ghost" data-go="reset">Do the Monday reset</button>`
				}</section>`
			: ""
	}
	${SHOWS_FOLLOW_UPS ? `<section><h2 class="section-title">Follow-ups due <span class="count">${followUps.length}</span></h2>
	${
		followUps.length
			? followUps
					.map(
						(f) => `<article class="card item"><p class="tag tag-${f.client.stage}">${esc(stageLabel(f.client.stage))}</p><h3>${esc(f.client.name)}</h3><p class="muted">${esc(f.label)}${f.client.project ? ` · ${esc(f.client.project)}` : ""} · due ${esc(fmtDate(f.dueOn))}</p>
						<div class="actions"><button class="btn" data-action="write" data-client="${f.client.id}" data-template="${f.template}" data-key="${esc(f.key)}">Write the email</button><button class="btn btn-ghost" data-action="mark-sent" data-client="${f.client.id}" data-key="${esc(f.key)}">Mark sent</button></div></article>`,
					)
					.join("")
			: `<p class="muted pad">Nothing due. You're caught up.</p>`
	}</section>` : ""}
	${SHOWS_ONBOARDING ? `<section><h2 class="section-title">Onboarding steps due <span class="count">${onboarding.length}</span></h2>
	${
		onboarding.length
			? onboarding
					.map(
						({ client, step }) => `<article class="card item"><h3>${esc(client.name)}</h3><p class="muted">${esc(step.label)} · due ${esc(fmtDate(addDays(client.stageDate, step.day)))}</p>
						<div class="actions">${step.template ? `<button class="btn" data-action="write" data-client="${client.id}" data-template="${step.template}" data-step="${step.id}">Write the email</button>` : ""}<button class="btn btn-ghost" data-action="step-done" data-client="${client.id}" data-step="${step.id}">Done</button></div></article>`,
					)
					.join("")
			: `<p class="muted pad">No onboarding steps due.</p>`
	}</section>` : ""}
	${
		soon.length
			? `<section><h2 class="section-title">Coming up this week</h2><ul class="list">${soon
					.map((x) => `<li><strong>${esc(fmtDate(x.next!.dueOn))}</strong> ${esc(x.client.name)}: ${esc(x.next!.label)}</li>`)
					.join("")}</ul></section>`
			: ""
	}`;
}

function clientForm(c?: Client): string {
	const stage = c?.stage ?? (EDITION === "onboarding" ? "active" : "lead");
	return `<form data-form="client" class="card form">
	<h2>${c ? "Edit client" : "Add a client"}</h2>
	<input type="hidden" name="id" value="${esc(c?.id ?? "")}">
	<label>Name<input name="name" required value="${esc(c?.name ?? "")}" autocomplete="off"></label>
	<label>Email<input name="email" type="email" value="${esc(c?.email ?? "")}" autocomplete="off"></label>
	<label>Project<input name="project" placeholder="e.g. Website refresh" value="${esc(c?.project ?? "")}"></label>
	<label>Amount<input name="amount" placeholder="e.g. $1,500" value="${esc(c?.amount ?? "")}" inputmode="decimal"></label>
	<label>Stage<select name="stage">${STAGES.map((s) => `<option value="${s.id}"${s.id === stage ? " selected" : ""}>${esc(s.label)}</option>`).join("")}</select></label>
	<label><span data-date-label>${esc(STAGES.find((s) => s.id === stage)!.dateLabel)}</span><input name="stageDate" type="date" required value="${esc(c?.stageDate ?? todayIso())}"></label>
	<label>Notes<textarea name="notes" rows="3">${esc(c?.notes ?? "")}</textarea></label>
	<div class="actions"><button class="btn">Save</button><button type="button" class="btn btn-ghost" data-action="cancel-edit">Cancel</button></div>
	</form>`;
}

function renderClientDetail(c: Client): string {
	const due = SHOWS_FOLLOW_UPS ? dueFollowUp(c) : null;
	const next = SHOWS_FOLLOW_UPS ? nextFollowUp(c) : null;
	const steps =
		c.stage === "active" && SHOWS_ONBOARDING
			? `<h3>Onboarding plan <span class="count">${ONBOARDING_STEPS.filter((s) => c.onboarding[s.id]).length} of ${ONBOARDING_STEPS.length}</span></h3><ul class="checklist">${ONBOARDING_STEPS.map(
					(s) => `<li><label><input type="checkbox" data-action="toggle-step" data-client="${c.id}" data-step="${s.id}"${c.onboarding[s.id] ? " checked" : ""}> <span>${esc(s.label)}</span> <small class="muted">${esc(fmtDate(addDays(c.stageDate, s.day)))}</small></label>${
						s.template && !c.onboarding[s.id] ? ` <button class="link" data-action="write" data-client="${c.id}" data-template="${s.template}" data-step="${s.id}">Write email</button>` : ""
					}</li>`,
				).join("")}</ul>`
			: "";
	return `<section class="card">
	<button class="link" data-action="back-to-list">← All clients</button>
	<p class="tag tag-${c.stage}">${esc(stageLabel(c.stage))}</p>
	<h2>${esc(c.name)}</h2>
	<p class="muted">${[c.project, c.amount, c.email].filter(Boolean).map(esc).join(" · ")}</p>
	<p>${esc(STAGES.find((s) => s.id === c.stage)!.dateLabel)}: <strong>${esc(fmtDate(c.stageDate))}</strong></p>
	${due ? `<p class="callout">Due now: ${esc(due.label)} <button class="btn" data-action="write" data-client="${c.id}" data-template="${due.template}" data-key="${esc(due.key)}">Write the email</button></p>` : ""}
	${next ? `<p class="muted">Next: ${esc(next.label)} on ${esc(fmtDate(next.dueOn))}</p>` : ""}
	<div class="actions"><label class="inline">Move to <select data-action="move-stage" data-client="${c.id}">${STAGES.map(
		(s) => `<option value="${s.id}"${s.id === c.stage ? " selected" : ""}>${esc(s.label)}</option>`,
	).join("")}</select></label></div>
	${steps}
	${c.notes ? `<h3>Notes</h3><p class="notes">${esc(c.notes)}</p>` : ""}
	<div class="actions"><button class="btn btn-ghost" data-action="edit-client" data-client="${c.id}">Edit</button><button class="btn btn-danger" data-action="delete-client" data-client="${c.id}">Delete</button></div>
	</section>`;
}

function renderClients(): string {
	if (editingClientId !== null) return clientForm(state.clients.find((c) => c.id === editingClientId));
	const selected = state.clients.find((c) => c.id === selectedClientId);
	if (selected) return renderClientDetail(selected);
	if (!state.clients.length) return emptyNote("No clients yet.", undefined) + `<button class="btn block" data-action="new-client">Add a client</button>`;

	const groups = STAGES.map((s) => ({ stage: s, clients: state.clients.filter((c) => c.stage === s.id) })).filter((g) => g.clients.length);
	return `<button class="btn block" data-action="new-client">Add a client</button>
	${groups
		.map(
			(g) => `<section><h2 class="section-title">${esc(g.stage.label)} <span class="count">${g.clients.length}</span></h2>${g.clients
				.map((c) => {
					const due = SHOWS_FOLLOW_UPS ? dueFollowUp(c) : null;
					const next = SHOWS_FOLLOW_UPS ? nextFollowUp(c) : null;
					const status = due
						? `<span class="due">Follow-up due</span>`
						: next
							? `Next ${esc(fmtDate(next.dueOn))}`
							: EDITION === "onboarding" && c.stage === "active"
								? dueOnboarding(c).length
									? `<span class="due">Step due</span>`
									: `${ONBOARDING_STEPS.filter((s) => c.onboarding[s.id]).length} of ${ONBOARDING_STEPS.length} done`
								: "";
					return `<button class="card row-card" data-action="open-client" data-client="${c.id}"><span><strong>${esc(c.name)}</strong><br><small class="muted">${esc(c.project || c.email || "")}</small></span><small>${status}</small></button>`;
				})
				.join("")}</section>`,
		)
		.join("")}`;
}

function renderEmails(): string {
	const client = state.clients.find((c) => c.id === email.clientId);
	const t = template(email.templateId) ?? BUILT_IN[0];
	const groups = [...new Set(BUILT_IN.map((x) => x.group))];
	const custom = state.custom.find((x) => x.id === t.id);
	const editing = state.custom.find((x) => x.id === editingTemplateId);
	const subject = fill(t.subject, client);
	const body = fill(t.body, client);
	const to = client?.email ?? "";
	return `<section class="card form">
	<h2>Email writer</h2>
	<label>Client<select data-action="email-client"><option value="">No client (fill in by hand)</option>${state.clients
		.map((c) => `<option value="${c.id}"${c.id === email.clientId ? " selected" : ""}>${esc(c.name)}</option>`)
		.join("")}</select></label>
	<label>Email<select data-action="email-template">${groups
		.map(
			(g) => `<optgroup label="${esc(g)}">${BUILT_IN.filter((x) => x.group === g)
				.map((x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.label)}</option>`)
				.join("")}</optgroup>`,
		)
		.join("")}${
		state.custom.length
			? `<optgroup label="${CUSTOM_GROUP}">${state.custom
					.map((x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.label)}</option>`)
					.join("")}</optgroup>`
			: ""
	}</select></label>
	<label>Subject<input id="email-subject" value="${esc(subject)}"></label>
	<label>Message<textarea id="email-body" rows="12">${esc(body)}</textarea></label>
	<p class="muted small">Replace anything in [brackets] before you send.</p>
	<div class="actions">
		<button class="btn" data-action="copy-email">Copy email</button>
		<a class="btn btn-ghost" id="email-open" href="mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Open in my email app</a>
		${email.followUpKey || email.onboardingStep ? `<button class="btn btn-ghost" data-action="email-done">Mark as sent</button>` : ""}
		${custom ? `<button class="link" data-action="edit-template" data-template="${custom.id}">Edit this email</button>` : ""}
	</div>
	</section>
	${
		SHOWS_ONBOARDING
			? `<section class="card form">
	<h2>Your intake questions</h2>
	<p class="muted small">These go into the Intake questions email. One question per line. {project} fills in the project name.</p>
	<form data-form="intake" class="form">
		<label><span class="sr">Intake questions</span><textarea name="questions" rows="7">${esc((state.intake ?? INTAKE_QUESTIONS).join("\n"))}</textarea></label>
		<div class="actions"><button class="btn">Save questions</button>${state.intake ? `<button type="button" class="btn btn-ghost" data-action="reset-intake">Use the default questions</button>` : ""}<button type="button" class="link" data-action="write" data-template="intake">Open the intake email</button></div>
	</form>
	</section>`
			: ""
	}
	<section class="card form">
	<h2>${editing ? "Edit your email" : "Add your own email"}</h2>
	<p class="muted small">Write it once and it's here every time. Use {first}, {name}, {project}, {amount}, {date} and {me} to fill in each person's details.</p>
	<form data-form="template" class="form">
		<input type="hidden" name="id" value="${esc(editing?.id ?? "")}">
		<label>Name<input name="label" required maxlength="80" value="${esc(editing?.label ?? "")}" placeholder="e.g. Check-in after a quiet month"></label>
		<label>Subject<input name="subject" required value="${esc(editing?.subject ?? "")}" placeholder="Quick check-in on {project}"></label>
		<label>Message<textarea name="body" rows="8" required placeholder="Hi {first},">${esc(editing?.body ?? "")}</textarea></label>
		<div class="actions"><button class="btn">${editing ? "Save changes" : "Save my email"}</button>${
			editing
				? `<button type="button" class="btn btn-ghost" data-action="cancel-template">Cancel</button><button type="button" class="btn btn-danger" data-action="delete-template" data-template="${editing.id}">Delete</button>`
				: ""
		}</div>
	</form>
	</section>`;
}

function renderReset(): string {
	const invoiced = state.clients.filter((c) => c.stage === "invoiced");
	const owed = invoiced.reduce((sum, c) => sum + money(c.amount), 0);
	const followUps = state.clients.filter((c) => dueFollowUp(c)).length;
	const onboarding = state.clients.reduce((n, c) => n + dueOnboarding(c).length, 0);
	const done = RESET_STEPS.filter((s) => state.reset.done[s.id]).length;
	const tasks = [...state.reset.tasks].sort((a, b) => taskScore(b) - taskScore(a));
	const scale = (name: string, label: string, min: number, max: number, hint: string) =>
		`<label>${esc(label)}<select name="${name}">${Array.from({ length: max - min + 1 }, (_, i) => min + i)
			.map((n) => `<option value="${n}">${n}</option>`)
			.join("")}</select><small class="muted">${esc(hint)}</small></label>`;
	const lastWeek = Object.keys(state.log).filter((w) => w < state.reset.week).sort().pop();
	const carried = lastWeek ? state.log[lastWeek].next : "";
	return `${carried ? `<section class="card hero"><p class="eyebrow">From last Friday</p><h2>${esc(carried)}</h2><p class="muted small">The first task you picked for this Monday.</p></section>` : ""}<section class="card">
	<p class="eyebrow">Week ${esc(state.reset.week.split("-W")[1])} · ${done} of ${RESET_STEPS.length} done</p>
	<h2>Monday reset, 20 minutes</h2>
	${
		EDITION === "system"
			? `<div class="stats"><div><strong>${invoiced.length}</strong><small>open invoices${owed ? ` · ${esc(currency(owed))}` : ""}</small></div><div><strong>${followUps}</strong><small>follow-ups due</small></div><div><strong>${onboarding}</strong><small>onboarding steps due</small></div></div>`
			: `<p class="muted">Work down the list. Tick each step when it's done.</p>`
	}
	<ul class="checklist">${RESET_STEPS.map(
		(s) => `<li><label><input type="checkbox" data-action="toggle-reset" data-step="${s.id}"${state.reset.done[s.id] ? " checked" : ""}> <span><strong>${esc(s.label)}</strong> <small class="muted">${s.minutes} min</small><br><small class="muted">${esc(EDITION === "reset" && s.standalone ? s.standalone : s.detail)}</small></span></label></li>`,
	).join("")}</ul>
	</section>
	<section class="card form">
	<h2>Priority scorer</h2>
	<p class="muted small">Score = money × 2 + urgency − effort. The top task becomes this week's #1 on the Today screen.</p>
	<form data-form="task" class="form">
		<label>Task<input name="text" required placeholder="e.g. Send the Acme proposal"></label>
		<div class="grid3">${scale("money", "Money", 0, 3, "Gets you paid?")}${scale("urgency", "Urgency", 0, 3, "Deadline soon?")}${scale("effort", "Effort", 1, 3, "How big?")}</div>
		<button class="btn">Add task</button>
	</form>
	${
		tasks.length
			? `<ol class="tasks">${tasks
					.map((t, i) => `<li${i === 0 ? ' class="top"' : ""}><span>${esc(t.text)}</span><small>score ${taskScore(t)}</small><button class="link" data-action="remove-task" data-task="${t.id}" aria-label="Remove ${esc(t.text)}">Remove</button></li>`)
					.join("")}</ol>`
			: ""
	}
	</section>
	${
		EDITION === "system"
			? `<section class="card"><h2>The rest of the week</h2><p class="muted">A 5-minute check on Thursday, a 10-minute close on Friday, and a log of every week.</p><div class="actions"><button class="btn" data-go="week">Thursday and Friday</button><button class="btn btn-ghost" data-go="log">Weekly log</button></div></section>`
			: ""
	}`;
}

function yesNo(name: string, value: string, label: string): string {
	return `<label>${esc(label)}<select name="${name}"><option value=""${value ? "" : " selected"}>Not yet</option><option value="yes"${value === "yes" ? " selected" : ""}>Yes</option><option value="no"${value === "no" ? " selected" : ""}>No</option></select></label>`;
}

function renderWeek(): string {
	const week = isoWeek();
	const log = state.log[week] ?? emptyWeek();
	const top = topTask()?.text || log.top;
	const field = (name: keyof WeekLog, label: string, hint = "") =>
		`<label>${esc(label)}${hint ? `<small class="muted">${esc(hint)}</small>` : ""}<textarea name="${name}" rows="2">${esc(log[name])}</textarea></label>`;
	const num = (name: "money" | "hours", label: string, step: string) =>
		`<label>${esc(label)}<input name="${name}" type="number" inputmode="decimal" min="0" step="${step}" value="${log[name] ?? ""}"></label>`;
	return `<section class="card priority"><p class="eyebrow">Week ${esc(week.split("-W")[1])} · your #1</p>${
		top ? `<h2>${esc(top)}</h2>` : `<p>No #1 yet.</p><button class="btn btn-ghost" data-go="reset">Do the Monday reset</button>`
	}</section>
	<section class="card form">
	<h2>Thursday check-in, 5 minutes</h2>
	<p class="muted small">Catch the week before it slips.</p>
	<form data-form="thursday" class="form">
		${yesNo("onTrack", log.onTrack, "Is your #1 done or on track?")}
		${field("blocker", "If not, what's in the way?")}
		${field("drop", "One thing you can drop or move to next week")}
		<button class="btn">Save check-in</button>
	</form>
	</section>
	<section class="card form">
	<h2>Friday close, 10 minutes</h2>
	<p class="muted small">Write the week down. It goes straight into your log.</p>
	<form data-form="friday" class="form">
		${yesNo("done", log.done, "Did your #1 get done?")}
		<div class="grid2">${num("money", "Money that came in ($)", "1")}${num("hours", "Hours on client work", "0.5")}</div>
		${field("wins", "Three things that got done")}
		${field("slipped", "What slipped, and why")}
		${field("next", "First task for next Monday", "It shows at the top of your Monday reset.")}
		<button class="btn">Save and close the week</button>
	</form>
	</section>`;
}

function renderLog(): string {
	const weeks = Object.entries(state.log)
		.filter(([, l]) => l.top || l.done || l.money !== null || l.wins)
		.sort(([a], [b]) => b.localeCompare(a));
	const doneCount = weeks.filter(([, l]) => l.done === "yes").length;
	const total = weeks.reduce((sum, [, l]) => sum + (l.money ?? 0), 0);
	const recent = weeks.slice(0, 52).reverse();
	const max = Math.max(1, ...recent.map(([, l]) => l.money ?? 0));
	if (!weeks.length) {
		return `<section class="card"><h2>Your weekly log</h2>${emptyNote("Close your first week on Friday and it shows up here.", { label: "Go to this week", view: "week" })}</section>`;
	}
	return `<section class="card">
	<h2>Your weekly log</h2>
	<div class="stats"><div><strong>${weeks.length}</strong><small>weeks logged</small></div><div><strong>${doneCount}</strong><small>#1 done${weeks.length ? ` · ${Math.round((doneCount / weeks.length) * 100)}%` : ""}</small></div><div><strong>${esc(currency(total))}</strong><small>money in</small></div></div>
	<h3>Money in by week</h3>
	<div class="bars" role="img" aria-label="Money in for the last ${recent.length} logged weeks">${recent
		.map(([w, l]) => `<span style="height:${Math.round(((l.money ?? 0) / max) * 100)}%" title="Week ${esc(w.split("-W")[1])}: ${esc(currency(l.money ?? 0))}"></span>`)
		.join("")}</div>
	</section>
	${weeks
		.map(
			([w, l]) => `<article class="card"><p class="eyebrow">Week ${esc(w.split("-W")[1])}, ${esc(w.split("-W")[0])}${l.done ? ` · #1 ${l.done === "yes" ? "done" : "not done"}` : ""}</p>${l.top ? `<h3>${esc(l.top)}</h3>` : ""}<p class="muted small">${l.money !== null ? `${esc(currency(l.money))} in` : "No money logged"}${l.hours !== null ? ` · ${esc(l.hours)} h` : ""}</p>${l.wins ? `<p class="notes">${esc(l.wins)}</p>` : ""}${l.slipped ? `<p class="muted small notes">Slipped: ${esc(l.slipped)}</p>` : ""}</article>`,
		)
		.join("")}`;
}

function renderPricing(): string {
	const p = state.pricing;
	const billable = Math.max(1, p.weeks * p.hours);
	const floor = (p.income + p.expenses) / billable;
	const project = p.projectHours * floor * (1 + p.buffer / 100);
	const retainer = p.retainerHours * floor;
	const field = (name: keyof Pricing, label: string, step = 1) =>
		`<label>${esc(label)}<input type="number" min="0" step="${step}" inputmode="decimal" data-pricing="${name}" value="${esc(p[name])}"></label>`;
	return `<section class="card form">
	<h2>Your hourly floor</h2>
	<p class="muted small">The lowest rate that covers what you want to earn and what the business costs to run.</p>
	<div class="grid2">${field("income", "Yearly take-home goal ($)", 1000)}${field("expenses", "Yearly business costs ($)", 100)}${field("weeks", "Working weeks a year")}${field("hours", "Billable hours a week")}</div>
	<p class="result">Hourly floor <strong>${esc(currency(Math.ceil(floor)))}</strong></p>
	</section>
	<section class="card form">
	<h2>Project and retainer prices</h2>
	<div class="grid2">${field("projectHours", "Hours you expect the project to take")}${field("buffer", "Buffer for surprises (%)", 5)}${field("retainerHours", "Retainer hours a month")}</div>
	<p class="result">Project price <strong>${esc(currency(Math.ceil(project / 50) * 50))}</strong></p>
	<p class="result">Monthly retainer <strong>${esc(currency(Math.ceil(retainer / 50) * 50))}</strong></p>
	<p class="muted small">Rounded up to the nearest $50. When a client pushes back, use the "When a client asks for a discount" email to trade scope for price.</p>
	<button class="btn btn-ghost" data-action="write" data-template="discount-reply">Open the discount reply</button>
	</section>`;
}

function renderSettings(): string {
	return `<section class="card form">
	<h2>Your sign-off</h2>
	<form data-form="me" class="row"><label class="grow"><span class="sr">Your name</span><input name="me" value="${esc(state.me)}" placeholder="Your name" autocomplete="name" required></label><button class="btn">Save</button></form>
	</section>
	<section class="card">
	<h2>Your data</h2>
	<p class="muted">Your ${EDITION === "reset" ? "weeks are" : "clients are"} saved in this browser on this device. Nothing is sent to Buzzyfly. To use the app on another device, open your access link there, then restore a backup.</p>
	<div class="actions"><button class="btn" data-action="backup">Download a backup</button><label class="btn btn-ghost file">Restore a backup<input type="file" accept="application/json,.json" data-action="restore"></label></div>
	</section>
	${
		EDITION === "reset"
			? `<section class="card"><h2>Want follow-ups and onboarding too?</h2><p class="muted">The Buzzyfly Digital System includes this app, plus who to follow up with today, the email to send, and onboarding for new clients. Your weeks come with you.</p><a class="btn btn-ghost" href="/store">See the Digital System</a></section>`
			: EDITION === "followups"
				? `<section class="card"><h2>Want onboarding and your Monday reset too?</h2><p class="muted">The Buzzyfly Digital System includes this app, plus a 10-step onboarding plan for each new client, proposal and scope replies, and the weekly reset. Your clients and emails come with you.</p><a class="btn btn-ghost" href="/store">See the Digital System</a></section>`
				: EDITION === "onboarding"
					? `<section class="card"><h2>Want follow-ups and your Monday reset too?</h2><p class="muted">The Buzzyfly Digital System includes this app, plus who to follow up with today, proposal and scope replies, and the weekly reset. Your clients and emails come with you.</p><a class="btn btn-ghost" href="/store">See the Digital System</a></section>`
					: ""
	}
	<section class="card">
	<h2>Help</h2>
	<p class="muted">Lost your access link or need a hand? Email <a href="mailto:support@buzzyfly.com">support@buzzyfly.com</a> from the address you checked out with.</p>
	</section>`;
}

const root = document.getElementById("app-root")!;
const status = document.getElementById("app-status")!;

function announce(message: string): void {
	status.textContent = message;
	window.setTimeout(() => {
		if (status.textContent === message) status.textContent = "";
	}, 2500);
}

function render(): void {
	rollWeek();
	const renderers: Record<View, () => string> = {
		today: renderToday,
		clients: renderClients,
		emails: renderEmails,
		reset: renderReset,
		week: renderWeek,
		log: renderLog,
		pricing: renderPricing,
		settings: renderSettings,
	};
	root.innerHTML =
		(saveFailed ? `<p class="callout">This browser isn't saving your changes, so they'll be lost when you close it. Turn off private browsing, or download a backup.</p>` : "") +
		renderers[view]();
	document.querySelectorAll<HTMLElement>("[data-nav]").forEach((el) => {
		if (el.dataset.nav === view) el.setAttribute("aria-current", "page");
		else el.removeAttribute("aria-current");
	});
}

function go(next: View): void {
	view = next;
	selectedClientId = null;
	editingClientId = null;
	if (location.hash !== `#${next}`) history.replaceState(null, "", `#${next}`);
	render();
	window.scrollTo({ top: 0 });
}

function clientById(id: string | undefined): Client | undefined {
	return state.clients.find((c) => c.id === id);
}

function markSent(client: Client, key: string): void {
	client.sent[key] = todayIso();
	save();
}

function emailText(): { subject: string; body: string } {
	return {
		subject: (document.getElementById("email-subject") as HTMLInputElement | null)?.value ?? "",
		body: (document.getElementById("email-body") as HTMLTextAreaElement | null)?.value ?? "",
	};
}

async function copy(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const area = document.createElement("textarea");
		area.value = text;
		document.body.appendChild(area);
		area.select();
		const ok = document.execCommand("copy");
		area.remove();
		return ok;
	}
}

// ---------- events ----------

document.addEventListener("click", async (event) => {
	const target = (event.target as HTMLElement).closest<HTMLElement>("[data-go], [data-nav], [data-action]");
	if (!target) return;
	const { go: goTo, nav, action, client: clientId, key, step, template: templateId, task } = target.dataset;

	if (goTo || nav) {
		event.preventDefault();
		go((goTo || nav) as View);
		return;
	}
	const client = clientById(clientId);

	switch (action) {
		case "new-client":
			view = "clients";
			editingClientId = "";
			selectedClientId = null;
			render();
			break;
		case "edit-client":
			editingClientId = clientId ?? null;
			render();
			break;
		case "cancel-edit":
			editingClientId = null;
			render();
			break;
		case "open-client":
			selectedClientId = clientId ?? null;
			render();
			window.scrollTo({ top: 0 });
			break;
		case "back-to-list":
			selectedClientId = null;
			render();
			break;
		case "delete-client":
			if (client && confirm(`Delete ${client.name}? This can't be undone.`)) {
				state.clients = state.clients.filter((c) => c.id !== client.id);
				selectedClientId = null;
				save();
				render();
				announce("Client deleted");
			}
			break;
		case "mark-sent":
			if (client && key) {
				markSent(client, key);
				render();
				announce("Marked as sent");
			}
			break;
		case "step-done":
			if (client && step) {
				client.onboarding[step] = true;
				save();
				render();
				announce("Step done");
			}
			break;
		case "write":
			email = { clientId: client?.id ?? "", templateId: templateId ?? BUILT_IN[0].id, followUpKey: key ?? null, onboardingStep: step ?? null };
			go("emails");
			break;
		case "copy-email": {
			const { subject, body } = emailText();
			announce((await copy(`Subject: ${subject}\n\n${body}`)) ? "Email copied" : "Couldn't copy. Select the text and copy it by hand.");
			break;
		}
		case "email-done": {
			const c = clientById(email.clientId);
			if (c && email.followUpKey) markSent(c, email.followUpKey);
			if (c && email.onboardingStep) {
				c.onboarding[email.onboardingStep] = true;
				save();
			}
			email = { ...email, followUpKey: null, onboardingStep: null };
			announce("Marked as sent");
			go("today");
			break;
		}
		case "edit-template":
			editingTemplateId = templateId ?? null;
			render();
			document.querySelector<HTMLInputElement>('form[data-form="template"] input[name="label"]')?.focus();
			break;
		case "cancel-template":
			editingTemplateId = null;
			render();
			break;
		case "delete-template":
			if (templateId && confirm("Delete this email? This can't be undone.")) {
				state.custom = state.custom.filter((t) => t.id !== templateId);
				if (email.templateId === templateId) email = { ...email, templateId: BUILT_IN[0].id };
				editingTemplateId = null;
				save();
				render();
				announce("Email deleted");
			}
			break;
		case "reset-intake":
			state.intake = null;
			save();
			render();
			announce("Default questions back");
			break;
		case "remove-task":
			state.reset.tasks = state.reset.tasks.filter((t) => t.id !== task);
			save();
			render();
			break;
		case "backup": {
			const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `buzzyfly-backup-${todayIso()}.json`;
			a.click();
			URL.revokeObjectURL(a.href);
			break;
		}
	}
});

document.addEventListener("change", (event) => {
	const el = event.target as HTMLInputElement | HTMLSelectElement;
	const { action, client: clientId, step } = el.dataset;
	const client = clientById(clientId);

	if (el.dataset.pricing) {
		const value = Number(el.value);
		if (Number.isFinite(value) && value >= 0) {
			state.pricing[el.dataset.pricing as keyof Pricing] = value;
			save();
			render();
		}
		return;
	}

	switch (action) {
		case "toggle-step":
			if (client && step) {
				client.onboarding[step] = (el as HTMLInputElement).checked;
				save();
				render();
			}
			break;
		case "toggle-reset":
			if (step) {
				state.reset.done[step] = (el as HTMLInputElement).checked;
				save();
				render();
			}
			break;
		case "move-stage":
			if (client) {
				client.stage = el.value as StageId;
				client.stageDate = todayIso();
				save();
				render();
				announce(`Moved to ${stageLabel(client.stage)}`);
			}
			break;
		case "email-client":
			email = { ...email, clientId: el.value, followUpKey: null, onboardingStep: null };
			render();
			break;
		case "email-template":
			email = { ...email, templateId: el.value, followUpKey: null, onboardingStep: null };
			render();
			break;
		case "restore": {
			const file = (el as HTMLInputElement).files?.[0];
			if (!file) break;
			file.text().then((text) => {
				try {
					const parsed: unknown = JSON.parse(text);
					if (!isState(parsed)) throw new Error("not a backup");
					if (!confirm("Replace everything in this browser with the backup?")) return;
					state = { ...defaultState(), ...parsed };
					save();
					render();
					announce("Backup restored");
				} catch {
					alert("That file isn't a Buzzyfly backup.");
				}
			});
			break;
		}
	}
	if (el.name === "stage") {
		const label = el.closest("form")?.querySelector("[data-date-label]");
		if (label) label.textContent = STAGES.find((s) => s.id === el.value)?.dateLabel ?? "Date";
	}
});

// Keep the "Open in my email app" link in step with edits to the subject and body.
document.addEventListener("input", (event) => {
	const el = event.target as HTMLElement;
	if (el.id !== "email-subject" && el.id !== "email-body") return;
	const link = document.getElementById("email-open") as HTMLAnchorElement | null;
	if (!link) return;
	const { subject, body } = emailText();
	const to = clientById(email.clientId)?.email ?? "";
	link.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

document.addEventListener("submit", (event) => {
	const form = event.target as HTMLFormElement;
	const kind = form.dataset.form;
	if (!kind) return;
	event.preventDefault();
	const data = new FormData(form);
	const get = (name: string) => String(data.get(name) ?? "").trim();

	if (kind === "me") {
		state.me = get("me");
		save();
		render();
		announce("Saved");
	} else if (kind === "client") {
		const id = get("id");
		const existing = clientById(id);
		const fields = {
			name: get("name"),
			email: get("email"),
			project: get("project"),
			amount: get("amount"),
			stage: (get("stage") || "lead") as StageId,
			stageDate: get("stageDate") || todayIso(),
			notes: get("notes"),
		};
		if (existing) Object.assign(existing, fields);
		else state.clients.push({ id: uid(), sent: {}, onboarding: {}, ...fields });
		editingClientId = null;
		selectedClientId = existing?.id ?? state.clients[state.clients.length - 1].id;
		save();
		render();
		announce("Client saved");
	} else if (kind === "template") {
		const fields = { label: get("label"), subject: get("subject"), body: String(data.get("body") ?? "") };
		const existing = state.custom.find((t) => t.id === get("id"));
		if (existing) Object.assign(existing, fields);
		else state.custom.push({ id: `custom-${uid()}`, ...fields });
		email = { ...email, templateId: existing?.id ?? state.custom[state.custom.length - 1].id, followUpKey: null, onboardingStep: null };
		editingTemplateId = null;
		save();
		render();
		announce("Email saved");
	} else if (kind === "intake") {
		const questions = String(data.get("questions") ?? "")
			.split("\n")
			.map((q) => q.trim().replace(/^\d+[.)]\s*/, ""))
			.filter(Boolean);
		state.intake = questions.length ? questions : null;
		save();
		render();
		announce("Questions saved");
	} else if (kind === "thursday" || kind === "friday") {
		const log = weekLog();
		const top = topTask();
		if (top) log.top = top.text;
		const choice = (name: string) => (["yes", "no"].includes(get(name)) ? get(name) : "") as WeekLog["done"];
		const amount = (name: string) => (get(name) === "" || !Number.isFinite(Number(get(name))) ? null : Math.max(0, Number(get(name))));
		if (kind === "thursday") Object.assign(log, { onTrack: choice("onTrack"), blocker: get("blocker"), drop: get("drop") });
		else Object.assign(log, { done: choice("done"), money: amount("money"), hours: amount("hours"), wins: get("wins"), slipped: get("slipped"), next: get("next") });
		save();
		if (kind === "friday") {
			announce("Week closed");
			go("log");
		} else {
			render();
			announce("Check-in saved");
		}
	} else if (kind === "task") {
		state.reset.tasks.push({
			id: uid(),
			text: get("text"),
			money: Number(get("money")) || 0,
			urgency: Number(get("urgency")) || 0,
			effort: Number(get("effort")) || 1,
		});
		save();
		render();
	}
});

window.addEventListener("hashchange", () => {
	const next = location.hash.slice(1) as View;
	if (VIEWS.includes(next) && next !== view) go(next);
});

const initial = location.hash.slice(1) as View;
view = VIEWS.includes(initial) ? initial : HOME;
render();
