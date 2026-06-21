'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InstallButton from '@/components/InstallButton';

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/pantry', label: 'Pantry', icon: '🫙' },
  { href: '/receipts', label: 'Receipts', icon: '🧾' },
  { href: '/meals', label: 'Log a Meal', icon: '🍽️' },
  { href: '/cook', label: 'Cook Now', icon: '👨‍🍳' },
  { href: '/shopping', label: 'Shopping List', icon: '🛒' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        🧭 PantryPilot
        <small>receipts → pantry → meals</small>
      </div>
      <nav className="nav">
        {links.map((l) => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
              <span>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <InstallButton />
    </aside>
  );
}
