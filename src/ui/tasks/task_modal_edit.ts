import type { App } from "obsidian";

/**
 * Opens a task line in an editor modal and resolves with the edited line(s),
 * or with "" when the edit is cancelled. Matches the contract of the Tasks
 * plugin's `apiV1.editTaskLineModal`.
 */
export type TaskLineEditor = (line: string) => Promise<string>;

type TasksPluginApiV1 = {
	editTaskLineModal?: (taskLine: string) => Promise<string>;
};

type AppWithPlugins = {
	plugins?: {
		plugins?: Record<string, { apiV1?: TasksPluginApiV1 } | undefined>;
	};
};

const TASKS_PLUGIN_ID = "obsidian-tasks-plugin";

/**
 * The Tasks plugin's edit modal, or null when the Tasks plugin is not enabled
 * (or is a version without `editTaskLineModal`). Looked up on every call so
 * enabling or disabling the Tasks plugin takes effect without a reload.
 * `app.plugins` is not part of Obsidian's public typings, hence the cast.
 */
export function getTasksPluginLineEditor(app: App): TaskLineEditor | null {
	const api = (app as unknown as AppWithPlugins).plugins?.plugins?.[TASKS_PLUGIN_ID]?.apiV1;
	const edit = api?.editTaskLineModal;
	return typeof edit === "function" ? (line) => edit.call(api, line) : null;
}

/**
 * Turns the modal's result into the rows that replace the original source
 * row, or null when nothing should be written.
 *
 * - "" (or whitespace) means the modal was cancelled: write nothing. This must
 *   never be treated as "replace with empty", which would delete the task.
 * - An unchanged line writes nothing.
 * - Completing a recurring task returns two lines (the next occurrence and the
 *   completed one), so the result may be several rows.
 * - Each row keeps the original's indentation, so nested tasks stay nested,
 *   and its "\r" when the file uses CRLF (`readFileRows` splits on "\n" only).
 */
export function planModalEdit(originalRow: string, edited: string): string[] | null {
	if (edited.trim() === "") return null;

	const eol = originalRow.endsWith("\r") ? "\r" : "";
	const original = eol ? originalRow.slice(0, -1) : originalRow;
	const indent = original.match(/^[ \t]*/)?.[0] ?? "";

	const rows = edited
		.replace(/\r/g, "")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => (line.startsWith(indent) ? line : indent + line.trimStart()));

	if (rows.length === 1 && rows[0] === original) return null;
	return rows.map((row) => row + eol);
}
