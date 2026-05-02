import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Client Flow',
    links: [
      { to: '/', label: 'Landing Page' },
      { to: '/app/product/pagini-groase', label: 'Produs — Pagini Groase' },
      { to: '/app/product/pagini-subtiri', label: 'Produs — Pagini Subțiri' },
      { to: '/app/offers', label: 'Oferte active' },
      { to: '/app/covers', label: 'Cover Selector' },
      { to: '/app/themes', label: 'Theme Selector' },
      { to: '/app/login', label: 'Login' },
      { to: '/app/editor', label: 'Editor' },
      { to: '/app/checkout', label: 'Checkout' },
      { to: '/app/confirm-self', label: 'Confirmare — Self Service' },
      { to: '/app/confirm-designer', label: 'Confirmare — Designer' },
      { to: '/app/cabinet', label: 'Cabinetul meu' },
    ],
  },
  {
    title: 'Admin Panel',
    links: [
      { to: '/admin_panel', label: 'Dashboard' },
      { to: '/admin_panel/live', label: 'Live & Analitică' },
      { to: '/admin_panel/orders', label: 'Toate comenzile' },
      { to: '/admin_panel/designer_queue', label: 'Așteaptă designer' },
      { to: '/admin_panel/approval_queue', label: 'Așteaptă aprobare' },
      { to: '/admin_panel/print_ready', label: 'Gata de tipar' },
      { to: '/admin_panel/clients', label: 'Clienți' },
      { to: '/admin_panel/invitations', label: 'Invitații & Linkuri' },
      { to: '/admin_panel/team', label: 'Echipă' },
    ],
  },
];

export default function PaginiScreen() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Toate paginile</h1>
      <p className="text-gray-400 mb-8">Acces rapid la orice pagină din aplicație</p>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
        {sections.map((section) => (
          <div key={section.title} className="glass-subtle rounded-xl p-6">
            <h2 className="text-lg font-semibold text-amber-400 mb-3 border-b border-gray-800 pb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              {section.title}
            </h2>
            <div className="flex flex-col gap-2">
              {section.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="glass block px-4 py-2.5 rounded-lg text-sm transition-colors no-underline"
                >
                  <span className="text-gray-400 text-xs mr-2 font-mono">{link.to}</span>
                  <br />
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
