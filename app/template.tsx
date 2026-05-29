// La transition de page vit désormais dans AppShell (zone de contenu uniquement),
// pour garder la sidebar fixe. Ce template reste un simple passe-plat.
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
