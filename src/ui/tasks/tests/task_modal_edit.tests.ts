import { describe, expect, it, vi } from "vitest";
import { getTasksPluginLineEditor, planModalEdit } from "../task_modal_edit";

describe("planModalEdit", () => {
	it("writes nothing when the modal is cancelled (empty result)", () => {
		expect(planModalEdit("- [ ] Task", "")).toBeNull();
		expect(planModalEdit("- [ ] Task", "  \n")).toBeNull();
	});

	it("writes nothing when the line is unchanged", () => {
		expect(planModalEdit("- [ ] Task #todo", "- [ ] Task #todo")).toBeNull();
	});

	it("replaces the row with the edited line", () => {
		expect(planModalEdit("- [ ] Task", "- [ ] Task 📅 2026-12-01")).toEqual([
			"- [ ] Task 📅 2026-12-01",
		]);
	});

	it("keeps the original indentation for nested tasks", () => {
		expect(planModalEdit("\t- [ ] Child", "- [ ] Child ⏫")).toEqual(["\t- [ ] Child ⏫"]);
		expect(planModalEdit("  - [ ] Child", "  - [ ] Child ⏫")).toEqual(["  - [ ] Child ⏫"]);
	});

	it("treats an indented line returned unchanged as unchanged", () => {
		expect(planModalEdit("\t- [ ] Child", "- [ ] Child")).toBeNull();
	});

	it("returns every line when a recurring task is completed", () => {
		const edited = "- [ ] Water plants 🔁 every week 📅 2026-11-25\n- [x] Water plants 🔁 every week 📅 2026-11-18 ✅ 2026-11-18";
		expect(planModalEdit("\t- [ ] Water plants 🔁 every week 📅 2026-11-18", edited)).toEqual([
			"\t- [ ] Water plants 🔁 every week 📅 2026-11-25",
			"\t- [x] Water plants 🔁 every week 📅 2026-11-18 ✅ 2026-11-18",
		]);
	});

	it("preserves a CRLF row ending on every replacement row", () => {
		expect(planModalEdit("- [ ] Task\r", "- [ ] Task ⏫")).toEqual(["- [ ] Task ⏫\r"]);
		expect(planModalEdit("- [ ] Task\r", "- [ ] Task")).toBeNull();
		expect(planModalEdit("- [ ] A\r", "- [ ] B\r\n- [x] A")).toEqual(["- [ ] B\r", "- [x] A\r"]);
	});
});

describe("getTasksPluginLineEditor", () => {
	it("returns null when the Tasks plugin is not enabled", () => {
		expect(getTasksPluginLineEditor({} as never)).toBeNull();
		expect(getTasksPluginLineEditor({ plugins: { plugins: {} } } as never)).toBeNull();
	});

	it("returns null when the Tasks API has no editTaskLineModal", () => {
		const app = { plugins: { plugins: { "obsidian-tasks-plugin": { apiV1: {} } } } };
		expect(getTasksPluginLineEditor(app as never)).toBeNull();
	});

	it("calls editTaskLineModal with the line and resolves its result", async () => {
		const editTaskLineModal = vi.fn(async (line: string) => `${line} ⏫`);
		const app = { plugins: { plugins: { "obsidian-tasks-plugin": { apiV1: { editTaskLineModal } } } } };

		const editor = getTasksPluginLineEditor(app as never);

		expect(editor).not.toBeNull();
		await expect(editor!("- [ ] Task")).resolves.toBe("- [ ] Task ⏫");
		expect(editTaskLineModal).toHaveBeenCalledWith("- [ ] Task");
	});
});
