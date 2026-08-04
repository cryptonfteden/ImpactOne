import { useState } from "react";
import Panel from "../layout/Panel";

// Phase X12C.0 — NOVA Showcase. Breadcrumb, Tabs, Drawer, Context Menu,
// Floating Panel, Topbar, and a presentational Sidebar sample — every one
// a real, reusable component, distinct from (and not touching) the
// existing app's real Sidebar.jsx/MainLayout.jsx.
export function Breadcrumb({ items }) {
  return (
    <nav className="nova-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? <span aria-hidden="true"> / </span> : null}
          {index === items.length - 1 ? <span className="nova-breadcrumb__current">{item.label}</span> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="nova-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab} type="button" role="tab" aria-selected={tab === activeTab} className="nova-tabs__tab" data-active={tab === activeTab ? "true" : "false"} onClick={() => onChange?.(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ children, open }) {
  if (!open) return null;
  return (
    <Panel elevation="glass" as="aside" className="nova-drawer" role="dialog" aria-modal="true">
      {children}
    </Panel>
  );
}

export function ContextMenu({ items }) {
  return (
    <Panel elevation="2" as="ul" className="nova-context-menu" role="menu">
      {items.map((item) => (
        <li key={item.label} role="none">
          <button type="button" role="menuitem" className="nova-context-menu__item">
            {item.label}
          </button>
        </li>
      ))}
    </Panel>
  );
}

export function FloatingPanel({ children }) {
  return (
    <Panel elevation="2" className="nova-floating-panel">
      {children}
    </Panel>
  );
}

export function TopBar({ title, right }) {
  return (
    <div className="nova-topbar">
      <strong className="nova-text-base">{title}</strong>
      <div>{right}</div>
    </div>
  );
}

export function SidebarSample({ items, activeItem }) {
  return (
    <nav className="nova-sidebar-sample" aria-label="Sample navigation">
      {items.map((item) => (
        <span key={item} className="nova-sidebar-sample__item" data-active={item === activeItem ? "true" : "false"}>
          {item}
        </span>
      ))}
    </nav>
  );
}

// A small, reusable open/close hook the Showcase's Drawer/ContextMenu
// demos share — kept here rather than duplicated inline per section.
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, toggle: () => setOpen((value) => !value), close: () => setOpen(false), openIt: () => setOpen(true) };
}
