"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ListPlus, Save } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addCourseListAction,
  addSemesterListAction,
} from "@/features/admin/reference/bulk-actions";
import {
  BULK_LIST_LIMIT,
  EMPTY_BULK_STATE,
  parseCourseList,
  parseSemesterList,
} from "@/features/admin/reference/bulk-list";
import type { AdminDepartment } from "@/features/admin/reference/types";

function SaveListButton({
  kind,
  disabled,
}: {
  kind: "courses" | "semesters";
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      <Save aria-hidden="true" />
      {pending ? "Saving list…" : `Save ${kind}`}
    </Button>
  );
}

export function BulkListForm({
  kind,
  departments = [],
}: {
  kind: "courses" | "semesters";
  departments?: AdminDepartment[];
}) {
  const uid = React.useId();
  const [state, action] = useFormState(
    kind === "courses" ? addCourseListAction : addSemesterListAction,
    EMPTY_BULK_STATE,
  );
  const [entries, setEntries] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const parsed =
    kind === "courses" ? parseCourseList(entries) : parseSemesterList(entries);
  React.useEffect(() => {
    if (state.ok) setEntries("");
  }, [state]);

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary">
          <ListPlus aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            Add your {kind} list
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Save once. These options appear automatically on teacher cards and
            review forms.
          </p>
        </div>
      </div>
      {kind === "courses" ? (
        <div className="space-y-2">
          <label
            htmlFor={`bulk-department-${uid}`}
            className="text-sm font-medium text-foreground"
          >
            Department for this list
          </label>
          <Select
            id={`bulk-department-${uid}`}
            name="departmentId"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Choose a department</option>
            {departments
              .filter((department) => department.isActive)
              .map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            These courses are available to every teacher in the university.
          </p>
        </div>
      ) : null}
      <div className="space-y-2">
        <label
          htmlFor={`bulk-entries-${uid}`}
          className="text-sm font-medium text-foreground"
        >
          One {kind === "courses" ? "course" : "semester"} per line
        </label>
        <Textarea
          id={`bulk-entries-${uid}`}
          name="entries"
          rows={7}
          value={entries}
          onChange={(event) => setEntries(event.target.value)}
          maxLength={kind === "courses" ? 40000 : 8000}
          spellCheck={false}
          aria-invalid={Boolean(parsed.error)}
          aria-describedby={`bulk-hint-${uid}`}
          placeholder={
            kind === "courses"
              ? "Artificial Intelligence\nData Structures\nCS-301 | Computer Networks"
              : "Spring 2024\nFall 2024\nspring25"
          }
        />
        <p
          id={`bulk-hint-${uid}`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {kind === "courses"
            ? "Course codes are optional. Use CODE | Course name to include one."
            : "Use Spring, Summer, Fall or Winter with a year. spring24 becomes Spring 2024."}{" "}
          Up to {BULK_LIST_LIMIT} entries per save; existing entries are
          skipped.
        </p>
      </div>
      {parsed.error ? (
        <p role="alert" className="text-sm text-state-danger">
          {parsed.error}
        </p>
      ) : parsed.items.length ? (
        <p className="text-sm text-muted-foreground">
          {parsed.items.length} {kind} ready to save
          {parsed.duplicates
            ? `; ${parsed.duplicates} duplicate ${parsed.duplicates === 1 ? "line" : "lines"} skipped`
            : ""}
          .
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SaveListButton
          kind={kind}
          disabled={
            !parsed.items.length ||
            Boolean(parsed.error) ||
            (kind === "courses" && !departmentId)
          }
        />
        {state.error ? (
          <p role="alert" className="text-sm text-state-danger">
            {state.error}
          </p>
        ) : state.ok ? (
          <p role="status" className="text-sm text-state-success">
            {state.added} added. {state.skipped} already listed or repeated.
          </p>
        ) : null}
      </div>
    </form>
  );
}
