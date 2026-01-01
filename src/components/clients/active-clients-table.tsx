"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Eye, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ActiveClient } from "@/lib/data/queries";

interface ActiveClientsTableProps {
  clients: ActiveClient[];
}

export function ActiveClientsTable({ clients }: ActiveClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No active clients yet</p>
        <p className="text-sm mt-1">Invite your first client to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Matters</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.userId}>
              <TableCell className="font-medium">
                {client.fullName || "Unnamed"}
              </TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell className="text-center">{client.matterCount}</TableCell>
              <TableCell>
                {client.lastActivity
                  ? format(new Date(client.lastActivity), "MMM d, yyyy")
                  : "Never"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/clients/${client.userId}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
