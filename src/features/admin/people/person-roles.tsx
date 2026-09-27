"use client";

import * as React from "react";

import { useFormState } from "react-dom";
import { Star, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormStatus, SubmitButton } from "@/features/admin/people/person-controls";
import {
  addRoleAction,
  setPrimaryRoleAction,
  setRoleActiveAction,
} from "@/features/admin/people/actions";
import {
  EMPTY_ROLE_ACTION_STATE,
  PERSON_CATEGORY_LABELS,
  PERSON_CATEGORY_ORDER,
  type AdminPersonRole,
} from "@/features/admin/people/types";
import type { AdminDepartment, AdminPosition } from "@/features/admin/reference/types";

/*
  Roles section: ek person ke ek ya zyada roles (README §49-§50).

  Ek role = category + optional department + optional position. Ek role primary hota
  hai (public profile usay dikhata hai). Roles hard delete nahi hote - archive/restore
  is_active se hota hai taake koi purana reference na toote. Authority DB me har RPC
  (is_admin()) par hai; yeh sirf forms hain.
*/

function RoleActiveButton({
  personId,
  roleId,
  isActive,
}: {
  personId: string;
  roleId: string;
  isActive: boolean;
}) {
  const [state, formAction] = useFormState(setRoleActiveAction, EMPTY_ROLE_ACTION_STATE);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <ActiveSubmit isActive={isActive} />
      {state.error ? (
        <span role="alert" className="text-xs text-state-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function ActiveSubmit({ isActive }: { isActive: boolean }) {
  return (
    <SubmitButton variant={isActive ? "outline" : "subtle"} pendingLabel="Saving" icon={null}>
      {isActive ? "Archive" : "Restore"}
    </SubmitButton>
  );
}

function MakePrimaryButton({ personId, roleId }: { personId: string; roleId: string }) {
  const [state, formAction] = useFormState(setPrimaryRoleAction, EMPTY_ROLE_ACTION_STATE);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="personId" value={personId} />
      <SubmitButton variant="subtle" pendingLabel="Saving" icon={<Star aria-hidden="true" />}>
        Make primary
      </SubmitButton>
      {state.error ? (
        <span role="alert" className="text-xs text-state-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function RoleRow({ personId, role }: { personId: string; role: AdminPersonRole }) {
  return (
    <li className="list-none rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-foreground">
              {PERSON_CATEGORY_LABELS[role.category]}
            </h4>
            {role.isPrimary ? (
              <Badge variant="accent">
                <Star aria-hidden="true" />
                Primary
              </Badge>
            ) : null}
            <Badge variant={role.isActive ? "brand" : "outline"}>
              {role.isActive ? "Active" : "Archived"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {role.departmentName ?? "No department"}
            {" · "}
            {role.positionTitle ?? "No position"}
            {role.titleOverride ? <span> · {role.titleOverride}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {role.isActive && !role.isPrimary ? (
            <MakePrimaryButton personId={personId} roleId={role.id} />
          ) : null}
          <RoleActiveButton personId={personId} roleId={role.id} isActive={role.isActive} />
        </div>
      </div>
    </li>
  );
}

function AddRoleForm({
  personId,
  departments,
  positions,
}: {
  personId: string;
  departments: AdminDepartment[];
  positions: AdminPosition[];
}) {
  const [state, formAction] = useFormState(addRoleAction, EMPTY_ROLE_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="personId" value={personId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="role-category">
            Category <span className="text-state-danger">*</span>
          </Label>
          <Select id="role-category" name="category" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {PERSON_CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {PERSON_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role-department">Department</Label>
          <Select id="role-department" name="departmentId" defaultValue="">
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role-position">Position</Label>
          <Select id="role-position" name="positionId" defaultValue="">
            <option value="">No position</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-primary">Primary role</Label>
        <Select id="role-primary" name="isPrimary" defaultValue="false">
          <option value="false">No</option>
          <option value="true">Yes, make this the primary role</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          The primary role is the one shown on the public profile.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton icon={<UserCog aria-hidden="true" />} pendingLabel="Adding">
          Add role
        </SubmitButton>
        <FormStatus state={state} okText="Role added." />
      </div>
    </form>
  );
}

export function PersonRolesSection({
  personId,
  roles,
  departments,
  positions,
}: {
  personId: string;
  roles: AdminPersonRole[];
  departments: AdminDepartment[];
  positions: AdminPosition[];
}) {
  return (
    <div className="space-y-5">
      {roles.length === 0 ? (
        <EmptyState
          icon={<UserCog />}
          title="No roles yet"
          description="Add a role below so this person shows up in the right department and category."
        />
      ) : (
        <ul className="list-none space-y-3">
          {roles.map((role) => (
            <RoleRow key={role.id} personId={personId} role={role} />
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-border p-4">
        <h4 className="mb-4 text-sm font-semibold text-foreground">Add a role</h4>
        <AddRoleForm personId={personId} departments={departments} positions={positions} />
      </div>
    </div>
  );
}
