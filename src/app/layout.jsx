import '../index.css'
import App from '../App'
import { ToastProvider } from '../components/Toast'

// oxlint-disable-next-line react/only-export-components -- Next.js reads metadata from this layout module.
export const metadata = {
  title: 'Item Rental',
  icons: { icon: '/item-rental-illustration.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><ToastProvider><App>{children}</App></ToastProvider></body>
    </html>
  )
}
