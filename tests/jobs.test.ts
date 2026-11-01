// Guards Buzzyfly Jobs, the site's subscription product. Run: npm run test:jobs
// If these fail, /jobs would show broken or empty listings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromJobicy, formatSalary, htmlToText } from "../src/lib/jobs";

const sample = {
	id: 158403,
	url: "https://jobicy.com/jobs/158403-staff-grc-analyst",
	jobTitle: "Staff GRC Analyst",
	companyName: "Tines",
	jobIndustry: ["Legal &amp; Compliance"],
	jobType: ["Full-Time"],
	jobGeo: "USA",
	jobDescription: "<p>Tines is <strong>hiring</strong>.</p><ul><li>Remote</li></ul><script>alert(1)</script>",
	pubDate: "2026-11-01T18:20:42+00:00",
	salaryMin: 215000,
	salaryMax: 230000,
	salaryCurrency: "USD",
	salaryPeriod: "yearly",
};

test("a Jobicy listing maps to the fields the /jobs pages read", () => {
	const job = fromJobicy(sample)!;
	assert.equal(job.id, 158403);
	assert.equal(job.url, sample.url, "Apply must go to the original Jobicy URL (their terms)");
	assert.equal(job.title, "Staff GRC Analyst");
	assert.equal(job.company_name, "Tines");
	assert.equal(job.job_type, "full_time");
	assert.equal(job.category, "Legal & Compliance");
	assert.equal(job.candidate_required_location, "USA");
	assert.equal(job.salary, "$215k–$230k/year");
	assert.equal(job.publication_date, sample.pubDate);
	assert.ok(!job.description!.includes("<"), "description must be plain text");
	assert.ok(!job.description!.includes("alert"), "scripts must be dropped");
});

test("listings the pages can't show are dropped", () => {
	assert.equal(fromJobicy({ ...sample, url: "javascript:alert(1)" }), null);
	assert.equal(fromJobicy({ ...sample, jobTitle: "" }), null);
	assert.equal(fromJobicy({ ...sample, companyName: undefined }), null);
});

test("salary is omitted when the feed has none", () => {
	assert.equal(formatSalary({}), undefined);
	assert.equal(formatSalary({ salaryMin: 50, salaryCurrency: "USD", salaryPeriod: "hourly" }), "$50/hour");
});

test("htmlToText decodes entities", () => {
	assert.equal(htmlToText("Sales &amp; Marketing"), "Sales & Marketing");
});
