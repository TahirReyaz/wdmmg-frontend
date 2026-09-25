"use client";

import { errorMessage } from "@/api/client";
import { useSetRole, useUsers } from "@/hooks/useAdmin";
import { useAuth } from "@/providers/AuthProvider";
import type { Role } from "@/types";
import { formatDate } from "@/utils/format";
import { Avatar } from "../common/Avatar";
import { Select } from "../ui/Field";
import { Panel, PanelHeader } from "../ui/Panel";
import { SkeletonTableRows } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { TD, TH, THead, TR, Table } from "../ui/Table";
import { useToast } from "../ui/Toast";

export function UsersAdmin() {
  const { user: me } = useAuth();
  const q = useUsers();
  const setRole = useSetRole();
  const toast = useToast();

  return (
    <Panel busy={q.isFetching && !q.isPending}>
      <PanelHeader title="People" description={q.data ? `${q.data.length} accounts` : " "} />
      {q.isError && !q.data ? (
        <ErrorState compact title="Unable to load people" error={q.error} onRetry={() => q.refetch()} retrying={q.isFetching} />
      ) : (
        <Table label="People">
          <THead>
            <tr>
              <TH>Name</TH>
              <TH className="hidden w-36 md:table-cell">Joined</TH>
              <TH className="w-40">Role</TH>
            </tr>
          </THead>
          <tbody>
            {q.isPending ? (
              <SkeletonTableRows rows={5} columns={[{ width: "45%", subline: true }, { width: "60%", className: "hidden md:table-cell" }, { width: "80%" }]} />
            ) : (
              q.data?.map((u) => (
                <TR key={u.id}>
                  <TD className="max-w-0">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-fg">
                          {u.name}
                          {u.id === me?.id && <span className="text-fg-3"> (you)</span>}
                        </span>
                        <span className="block truncate text-sm text-fg-3">{u.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD className="tabular hidden text-fg-2 md:table-cell">{formatDate(u.createdAt.slice(0, 10))}</TD>
                  <TD>
                    <Select
                      selectSize="sm"
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? "You can't change your own role" : undefined}
                      onChange={(e) =>
                        setRole.mutate(
                          { user: u, role: e.target.value as Role },
                          {
                            onSuccess: (updated) => toast.success(`${updated.name} is now ${updated.role === "ADMIN" ? "an admin" : "a member"}`),
                            onError: (err) => toast.error("Couldn't change role", { description: errorMessage(err) }),
                          },
                        )
                      }
                    >
                      <option value="USER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </Select>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
