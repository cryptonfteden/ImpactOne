import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Breadcrumb, Tabs, Drawer, ContextMenu, FloatingPanel, TopBar, SidebarSample, Button, useDisclosure } from "../../../components/nova";
import { useState } from "react";

export default function NavigationSection() {
  const [activeTab, setActiveTab] = useState("Overview");
  const drawer = useDisclosure(false);

  return (
    <ShowcaseSection id="navigation" number={8} title="Navigation" description="Sidebar, Topbar, Breadcrumb, Tabs, Drawer, Context Menu, Floating Panel.">
      <TopBar title="ImpactOne" right={<Button variant="ghost" size="compact">Sign out</Button>} />

      {/* X12C.0.2 — Final Showcase Polish, fix #2. SidebarSample has a
          fixed 220px inline-size (.nova-sidebar-sample) — the one Stack in
          this section that combined a fixed-width child with a flexible
          one and no `wrap`, so below ~320-390px it forced this row wider
          than the container instead of collapsing to a single column like
          every other multi-item row in the Showcase already does. */}
      <Stack direction="horizontal" gap={0} wrap>
        <SidebarSample items={["Home", "Portfolio", "Decision Center"]} activeItem="Portfolio" />
        <Stack gap={4} style={{ padding: "var(--nova-space-4)" }}>
          <Breadcrumb items={[{ label: "Home" }, { label: "Portfolio" }, { label: "NVDA" }]} />
          <Tabs tabs={["Overview", "History", "Notes"]} activeTab={activeTab} onChange={setActiveTab} />
        </Stack>
      </Stack>

      <Stack direction="horizontal" gap={6} wrap>
        <Button variant="secondary" onClick={drawer.toggle}>
          {drawer.open ? "Close drawer" : "Open drawer"}
        </Button>
        <ContextMenu items={[{ label: "Save to watchlist" }, { label: "Dismiss" }]} />
        <FloatingPanel>
          <span className="nova-text-sm">A floating, elevated panel.</span>
        </FloatingPanel>
      </Stack>

      <Drawer open={drawer.open}>
        <p className="nova-text-sm">Drawer content — real recommendation detail would render here.</p>
      </Drawer>
    </ShowcaseSection>
  );
}
