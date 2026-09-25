"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { PageHeader } from "@/components/layout/PageHeader";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "categories" | "people";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("categories");
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/");
  }, [user, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <>
      <PageHeader title="Admin" description="Manage the expense categories everyone uses and who has admin access." />
      <Tabs
        idBase="admin"
        label="Admin sections"
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "categories", label: "Categories" },
          { value: "people", label: "People" },
        ]}
      />
      <TabPanel idBase="admin" value={tab}>
        {tab === "categories" ? <CategoriesAdmin /> : <UsersAdmin />}
      </TabPanel>
    </>
  );
}
