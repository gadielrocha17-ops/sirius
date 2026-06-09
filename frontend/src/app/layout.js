import './globals.css'
import { UserProvider } from '../hooks/useUser'

export const metadata = {
  title: 'Sirius — Atendimento com IA',
  description: 'Plataforma SaaS de atendimento ao cliente com agentes de IA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
