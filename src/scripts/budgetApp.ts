/**
 * Buzzyfly Budget: a paycheck-to-paycheck budget planner that runs in the
 * browser. Everything is stored on the buyer's device (localStorage) and never
 * sent to the server. Export/import gives them a backup file.
 *
 * Screens: Month (plan + left to budget), Spend (log spending), Bills (due
 * dates, paid this month), Debt (snowball/avalanche payoff date), More
 * (savings goals, couples names, backup).
 */

type Id = string;
interface Income { id: Id; name: string; amount: number; who: number }
interface Category { id: Id; name: string; planned: number }
interface Tx { id: Id; date: string; catId: Id; amount: number; note: string; who: number }
interface MonthData { income: Income[]; cats: Category[]; tx: Tx[]; billsPaid: Record<Id, boolean> }
interface Bill { id: Id; name: string; amount: number; day: number }
interface Debt { id: Id; name: string; balance: number; rate: number; min: number }
interface Goal { id: Id; name: string; target: number; saved: number }
interface State {
	v: 1;
	couples: boolean;
	people: [string, string];
	months: Record<string, MonthData>;
	bills: Bill[];
	debts: Debt[];
	goals: Goal[];
	extra: number;
	strategy: "snowball" | "avalanche";
}

const KEY = "bf_budget_v1";
const DEFAULT_CATS: [string, number][] = [
	["Rent / mortgage", 0], ["Groceries", 0], ["Utilities", 0], ["Transport", 0],
	["Phone & internet", 0], ["Eating out", 0], ["Fun", 0], ["Savings", 0],
];

const root = document.getElementById("app-root")!;
const statusEl = document.getElementById("app-status")!;

const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s: unknown) =>
	String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const num = (v: unknown) => {
	const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const money = (n: number) =>
	(n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string) => {
	const [y, m] = k.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const shiftMonth = (k: string, by: number) => {
	const [y, m] = k.split("-").map(Number);
	return monthKey(new Date(y, m - 1 + by, 1));
};
const today = () => new Date().toISOString().slice(0, 10);
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

function blankMonth(): MonthData {
	return { income: [], cats: DEFAULT_CATS.map(([name, planned]) => ({ id: uid(), name, planned })), tx: [], billsPaid: {} };
}

function load(): State {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const s = JSON.parse(raw) as State;
			if (s && s.v === 1) return s;
		}
	} catch { /* fall through to a fresh state */ }
	return { v: 1, couples: false, people: ["You", "Partner"], months: {}, bills: [], debts: [], goals: [], extra: 0, strategy: "snowball" };
}

let state = load();
let current = monthKey();

function save(msg?: string) {
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		say("Couldn't save. Your browser storage may be full or turned off.");
		return;
	}
	if (msg) say(msg);
}
function say(msg: string) {
	statusEl.textContent = "";
	requestAnimationFrame(() => (statusEl.textContent = msg));
}

/** The month being viewed. A new month starts from the previous month's plan. */
function month(k = current): MonthData {
	if (!state.months[k]) {
		const prev = state.months[shiftMonth(k, -1)];
		state.months[k] = prev
			? {
					income: prev.income.map((i) => ({ ...i, id: uid() })),
					cats: prev.cats.map((c) => ({ ...c, id: uid() })),
					tx: [],
					billsPaid: {},
				}
			: blankMonth();
	}
	return state.months[k];
}

function whoSelect(name: string, value = 0) {
	if (!state.couples) return "";
	return `<label>Whose<select name="${name}">${state.people
		.map((p, i) => `<option value="${i}"${i === value ? " selected" : ""}>${esc(p)}</option>`)
		.join("")}</select></label>`;
}
const whoTag = (i: number) => (state.couples ? ` <span class="tag">${esc(state.people[i] ?? "")}</span>` : "");

function monthNav() {
	return `<div class="actions" style="justify-content:space-between;margin:0 0 12px">
		<button class="btn btn-ghost" data-act="prev" aria-label="Previous month">‹</button>
		<strong>${esc(monthLabel(current))}</strong>
		<button class="btn btn-ghost" data-act="next" aria-label="Next month">›</button>
	</div>`;
}

function bar(spent: number, planned: number) {
	const pct = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : spent > 0 ? 100 : 0;
	const over = planned > 0 ? spent > planned : spent > 0;
	return `<div style="height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:6px" aria-hidden="true">
		<div style="height:100%;width:${pct}%;background:${over ? "var(--danger)" : "var(--brand)"}"></div></div>`;
}

/* ---------- Screens ---------- */

function viewMonth() {
	const m = month();
	const income = sum(m.income.map((i) => i.amount));
	const planned = sum(m.cats.map((c) => c.planned));
	const spent = sum(m.tx.map((t) => t.amount));
	const left = Math.round((income - planned) * 100) / 100;
	const spentBy = (id: Id) => sum(m.tx.filter((t) => t.catId === id).map((t) => t.amount));

	return `${monthNav()}
	<section class="card hero">
		<div class="eyebrow">Left to budget</div>
		<h1 style="font-size:2rem;margin:0;color:${left < 0 ? "var(--danger)" : "var(--ink)"}">${money(left)}</h1>
		<p class="muted small">${left === 0 && income > 0 ? "Every dollar has a job. Nice." : left > 0 ? "Give these dollars a job below." : left < 0 ? "You've planned more than you earn. Trim a category." : "Add your income to start."}</p>
		<div class="stats">
			<div><strong>${money(income)}</strong><small>Income</small></div>
			<div><strong>${money(planned)}</strong><small>Planned</small></div>
			<div><strong>${money(spent)}</strong><small>Spent</small></div>
		</div>
	</section>

	<h2 class="section-title">Income <span class="count">${m.income.length}</span></h2>
	${m.income.map((i) => `<div class="card row-card"><div><strong>${esc(i.name)}</strong>${whoTag(i.who)}</div>
		<div class="actions" style="margin:0"><span>${money(i.amount)}</span><button class="link" data-act="del-income" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">✕</button></div></div>`).join("")}
	<form class="card form" data-form="income">
		<div class="grid2"><label>Paycheck or income<input name="name" required placeholder="Paycheck 1"></label>
		<label>Amount<input name="amount" inputmode="decimal" required placeholder="1800"></label></div>
		${whoSelect("who")}
		<button class="btn">Add income</button>
	</form>

	<h2 class="section-title">Spending plan <span class="count">${m.cats.length}</span></h2>
	<p class="muted small pad">Type what you plan to spend in each category. It saves as you go.</p>
	${m.cats.map((c) => {
		const s = spentBy(c.id);
		return `<div class="card">
			<div class="row"><label class="grow">${esc(c.name)}<input data-plan="${c.id}" inputmode="decimal" value="${c.planned || ""}" placeholder="0"></label>
			<button class="link" data-act="del-cat" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">✕</button></div>
			${bar(s, c.planned)}
			<p class="small muted" style="margin:6px 0 0">${money(s)} spent · <span class="${c.planned - s < 0 ? "due" : ""}">${money(c.planned - s)} left</span></p>
		</div>`;
	}).join("")}
	<form class="card form" data-form="cat">
		<div class="row"><label class="grow">New category<input name="name" required placeholder="Pet, gifts, gym…"></label><button class="btn">Add</button></div>
	</form>`;
}

function viewSpend() {
	const m = month();
	const txs = [...m.tx].sort((a, b) => b.date.localeCompare(a.date));
	const catName = (id: Id) => m.cats.find((c) => c.id === id)?.name ?? "Uncategorized";
	return `${monthNav()}
	<form class="card form hero" data-form="tx">
		<h2>Log spending</h2>
		<div class="grid2"><label>Amount<input name="amount" inputmode="decimal" required placeholder="24.50" autofocus></label>
		<label>Category<select name="catId">${m.cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label></div>
		<div class="grid2"><label>Date<input type="date" name="date" value="${today()}"></label>
		<label>Note <small>optional</small><input name="note" placeholder="Costco"></label></div>
		${whoSelect("who")}
		<button class="btn block">Add</button>
	</form>
	${state.couples && txs.length ? `<p class="small muted pad">${state.people.map((p, i) => `${esc(p)}: ${money(sum(m.tx.filter((t) => t.who === i).map((t) => t.amount)))}`).join(" · ")}</p>` : ""}
	<h2 class="section-title">This month <span class="count">${txs.length}</span></h2>
	${txs.length ? txs.map((t) => `<div class="card row-card"><div><strong>${money(t.amount)}</strong> · ${esc(catName(t.catId))}${whoTag(t.who)}<br><small class="muted">${esc(t.date)}${t.note ? " · " + esc(t.note) : ""}</small></div>
		<button class="link" data-act="del-tx" data-id="${t.id}" aria-label="Delete">✕</button></div>`).join("") : `<p class="empty">Nothing logged yet this month.</p>`}`;
}

function viewBills() {
	const m = month();
	const bills = [...state.bills].sort((a, b) => a.day - b.day);
	const total = sum(bills.map((b) => b.amount));
	const paid = sum(bills.filter((b) => m.billsPaid[b.id]).map((b) => b.amount));
	const isThisMonth = current === monthKey();
	const day = new Date().getDate();
	return `${monthNav()}
	<section class="card hero">
		<div class="eyebrow">Bills this month</div>
		<div class="stats">
			<div><strong>${money(total)}</strong><small>Total</small></div>
			<div><strong>${money(paid)}</strong><small>Paid</small></div>
			<div><strong>${money(total - paid)}</strong><small>Still due</small></div>
		</div>
	</section>
	${bills.length ? `<ul class="checklist card">${bills.map((b) => {
		const late = isThisMonth && !m.billsPaid[b.id] && b.day < day;
		const soon = isThisMonth && !m.billsPaid[b.id] && b.day >= day && b.day - day <= 3;
		return `<li><label><input type="checkbox" data-bill="${b.id}"${m.billsPaid[b.id] ? " checked" : ""}>
			<span class="grow"><strong>${esc(b.name)}</strong> · ${money(b.amount)}<br><small class="${late || soon ? "due" : "muted"}">Due on the ${ordinal(b.day)}${late ? " · overdue" : soon ? " · due soon" : ""}</small></span></label>
			<button class="link small" data-act="del-bill" data-id="${b.id}" aria-label="Remove ${esc(b.name)}">Remove</button></li>`;
	}).join("")}</ul>` : `<p class="empty">Add your bills once. Tick them off each month.</p>`}
	<form class="card form" data-form="bill">
		<div class="grid3"><label>Bill<input name="name" required placeholder="Car insurance"></label>
		<label>Amount<input name="amount" inputmode="decimal" required placeholder="120"></label>
		<label>Due day<input name="day" type="number" min="1" max="31" required placeholder="15"></label></div>
		<button class="btn">Add bill</button>
	</form>`;
}

function ordinal(n: number) {
	const s = ["th", "st", "nd", "rd"], v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Month-by-month payoff simulation. Freed-up minimums roll into the next debt. */
function payoff() {
	const debts = state.debts.map((d) => ({ ...d }));
	const order = () =>
		debts.filter((d) => d.balance > 0.005).sort((a, b) =>
			state.strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate || a.balance - b.balance,
		);
	const budget = sum(state.debts.map((d) => d.min)) + state.extra;
	let months = 0, interest = 0;
	const paidOff: { name: string; month: number }[] = [];
	while (order().length && months < 600) {
		months++;
		for (const d of debts) if (d.balance > 0) { const i = d.balance * (d.rate / 100 / 12); d.balance += i; interest += i; }
		let pot = budget;
		for (const d of order()) { const p = Math.min(d.min, d.balance, pot); d.balance -= p; pot -= p; }
		for (const d of order()) { if (pot <= 0) break; const p = Math.min(pot, d.balance); d.balance -= p; pot -= p; }
		for (const d of debts) if (d.balance <= 0.005 && !paidOff.find((x) => x.name === d.name + d.id)) { d.balance = 0; paidOff.push({ name: d.name + d.id, month: months }); }
	}
	return { months, interest, done: months < 600, paidOff };
}

function viewDebt() {
	const total = sum(state.debts.map((d) => d.balance));
	const p = state.debts.length ? payoff() : null;
	const when = (mo: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + mo); return d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); };
	return `
	<section class="card hero">
		<div class="eyebrow">Debt-free date</div>
		${p ? (p.done
			? `<h1 style="margin:0">${esc(when(p.months))}</h1><p class="muted small">${p.months} months · ${money(p.interest)} interest · ${money(total)} owed today</p>`
			: `<h1 style="margin:0;color:var(--danger)">Not at this pace</h1><p class="small">Your payments don't cover the interest. Raise a minimum or add an extra amount below.</p>`)
		: `<p class="muted">Add your debts to see the month you'll be debt-free.</p>`}
	</section>
	<form class="card form" data-form="plan">
		<div class="grid2"><label>Method<select name="strategy">
			<option value="snowball"${state.strategy === "snowball" ? " selected" : ""}>Snowball: smallest balance first</option>
			<option value="avalanche"${state.strategy === "avalanche" ? " selected" : ""}>Avalanche: highest interest first</option></select></label>
		<label>Extra each month<input name="extra" inputmode="decimal" value="${state.extra || ""}" placeholder="100"></label></div>
		<button class="btn btn-ghost">Update plan</button>
	</form>
	${state.debts.map((d) => {
		const hit = p?.paidOff.find((x) => x.name === d.name + d.id);
		return `<div class="card row-card"><div><strong>${esc(d.name)}</strong><br><small class="muted">${money(d.balance)} · ${d.rate}% · min ${money(d.min)}${hit && p?.done ? ` · paid off ${esc(when(hit.month))}` : ""}</small></div>
		<button class="link" data-act="del-debt" data-id="${d.id}" aria-label="Remove ${esc(d.name)}">✕</button></div>`;
	}).join("")}
	<form class="card form" data-form="debt">
		<div class="grid2"><label>Debt<input name="name" required placeholder="Visa card"></label>
		<label>Balance<input name="balance" inputmode="decimal" required placeholder="2400"></label></div>
		<div class="grid2"><label>Interest rate %<input name="rate" inputmode="decimal" placeholder="24.99"></label>
		<label>Minimum payment<input name="min" inputmode="decimal" required placeholder="60"></label></div>
		<button class="btn">Add debt</button>
	</form>`;
}

function viewMore() {
	return `
	<h2 class="section-title">Savings goals <span class="count">${state.goals.length}</span></h2>
	${state.goals.map((g) => `<div class="card">
		<div class="row-card" style="min-height:0;cursor:default"><strong>${esc(g.name)}</strong><button class="link" data-act="del-goal" data-id="${g.id}" aria-label="Remove ${esc(g.name)}">✕</button></div>
		${bar(g.saved, g.target)}
		<p class="small muted" style="margin:6px 0">${money(g.saved)} of ${money(g.target)}${g.target > g.saved ? ` · ${money(g.target - g.saved)} to go` : " · reached 🎉"}</p>
		<form class="row" data-form="goal-add" data-id="${g.id}"><label class="grow">Add to this goal<input name="amount" inputmode="decimal" placeholder="50"></label><button class="btn btn-ghost">Add</button></form>
	</div>`).join("")}
	<form class="card form" data-form="goal">
		<div class="grid2"><label>Goal<input name="name" required placeholder="Emergency fund"></label>
		<label>Target<input name="target" inputmode="decimal" required placeholder="1000"></label></div>
		<button class="btn">Add goal</button>
	</form>

	<h2 class="section-title">Budget together</h2>
	<form class="card form" data-form="people">
		<label class="inline"><input type="checkbox" name="couples"${state.couples ? " checked" : ""}> Couples mode: tag income and spending by person</label>
		<div class="grid2"><label>Person 1<input name="p0" value="${esc(state.people[0])}"></label>
		<label>Person 2<input name="p1" value="${esc(state.people[1])}"></label></div>
		<button class="btn btn-ghost">Save</button>
	</form>

	<h2 class="section-title">Backup</h2>
	<div class="card">
		<p class="small">Your budget is saved only in this browser. Nothing is sent to us. Download a backup to move it to another device.</p>
		<div class="actions">
			<button class="btn btn-ghost" data-act="export">Download backup</button>
			<label class="btn btn-ghost file">Restore backup<input type="file" accept="application/json" data-act="import"></label>
			<button class="btn btn-danger" data-act="wipe">Erase everything</button>
		</div>
	</div>`;
}

/* ---------- Router ---------- */

const VIEWS: Record<string, () => string> = { month: viewMonth, spend: viewSpend, bills: viewBills, debt: viewDebt, more: viewMore };

function render(focus = false) {
	const route = location.hash.slice(1);
	const id = VIEWS[route] ? route : "month";
	root.innerHTML = VIEWS[id]();
	document.querySelectorAll<HTMLAnchorElement>("[data-nav]").forEach((a) => {
		if (a.dataset.nav === id && a.closest(".tabs")) a.setAttribute("aria-current", "page");
		else a.removeAttribute("aria-current");
	});
	if (focus) root.focus();
}

window.addEventListener("hashchange", () => { render(true); window.scrollTo(0, 0); });

root.addEventListener("submit", (e) => {
	const form = e.target as HTMLFormElement;
	const kind = form.dataset.form;
	if (!kind) return;
	e.preventDefault();
	const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
	const m = month();
	switch (kind) {
		case "income": m.income.push({ id: uid(), name: f.name.trim(), amount: num(f.amount), who: Number(f.who) || 0 }); save("Income added"); break;
		case "cat": m.cats.push({ id: uid(), name: f.name.trim(), planned: 0 }); save("Category added"); break;
		case "tx": {
			const amount = num(f.amount);
			if (!amount) return say("Enter an amount");
			m.tx.push({ id: uid(), date: f.date || today(), catId: f.catId, amount, note: (f.note || "").trim(), who: Number(f.who) || 0 });
			save(`Logged ${money(amount)}`);
			break;
		}
		case "bill": state.bills.push({ id: uid(), name: f.name.trim(), amount: num(f.amount), day: Math.min(31, Math.max(1, Number(f.day) || 1)) }); save("Bill added"); break;
		case "debt": state.debts.push({ id: uid(), name: f.name.trim(), balance: num(f.balance), rate: num(f.rate), min: num(f.min) }); save("Debt added"); break;
		case "plan": state.strategy = f.strategy === "avalanche" ? "avalanche" : "snowball"; state.extra = num(f.extra); save("Plan updated"); break;
		case "goal": state.goals.push({ id: uid(), name: f.name.trim(), target: num(f.target), saved: 0 }); save("Goal added"); break;
		case "goal-add": { const g = state.goals.find((x) => x.id === form.dataset.id); if (g) { g.saved = Math.round((g.saved + num(f.amount)) * 100) / 100; save("Saved toward goal"); } break; }
		case "people": state.couples = f.couples === "on"; state.people = [f.p0?.trim() || "You", f.p1?.trim() || "Partner"]; save("Saved"); break;
	}
	render();
});

root.addEventListener("change", (e) => {
	const el = e.target as HTMLInputElement;
	if (el.dataset.plan) {
		const c = month().cats.find((x) => x.id === el.dataset.plan);
		if (c) { c.planned = num(el.value); save("Saved"); render(); }
	} else if (el.dataset.bill) {
		month().billsPaid[el.dataset.bill] = el.checked;
		save(el.checked ? "Marked paid" : "Marked unpaid");
		render();
	} else if (el.dataset.act === "import" && el.files?.[0]) {
		el.files[0].text().then((txt) => {
			try {
				const s = JSON.parse(txt) as State;
				if (!s || s.v !== 1 || typeof s.months !== "object") throw new Error("bad file");
				if (!confirm("Replace the budget in this browser with the backup?")) return;
				state = s; save("Backup restored"); render();
			} catch { say("That file isn't a Buzzyfly Budget backup."); }
		});
	}
});

root.addEventListener("click", (e) => {
	const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
	if (!btn || btn.tagName === "INPUT") return;
	const id = btn.dataset.id;
	const m = month();
	switch (btn.dataset.act) {
		case "prev": current = shiftMonth(current, -1); break;
		case "next": current = shiftMonth(current, 1); break;
		case "del-income": m.income = m.income.filter((x) => x.id !== id); save("Removed"); break;
		case "del-cat":
			if (m.tx.some((t) => t.catId === id) && !confirm("This category has spending logged. Remove it anyway?")) return;
			m.cats = m.cats.filter((x) => x.id !== id); save("Removed"); break;
		case "del-tx": m.tx = m.tx.filter((x) => x.id !== id); save("Deleted"); break;
		case "del-bill": state.bills = state.bills.filter((x) => x.id !== id); save("Removed"); break;
		case "del-debt": state.debts = state.debts.filter((x) => x.id !== id); save("Removed"); break;
		case "del-goal": state.goals = state.goals.filter((x) => x.id !== id); save("Removed"); break;
		case "export": {
			const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `buzzyfly-budget-${today()}.json`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 1000);
			return say("Backup downloaded");
		}
		case "wipe":
			if (!confirm("Erase every month, bill, debt and goal in this browser? This can't be undone.")) return;
			localStorage.removeItem(KEY); state = load(); say("Erased"); break;
		default: return;
	}
	render();
});

render();

export {};
