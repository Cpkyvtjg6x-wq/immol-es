import { redirect } from 'next/navigation'

// La page profil a été fusionnée dans le hub /settings.
export default function ProfileRedirect() {
  redirect('/settings')
}
