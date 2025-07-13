import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 Shinwa. All rights reserved.
            </p>
          </div>
          <nav className="flex space-x-6">
            <Link 
              href="/pricing" 
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              料金プラン
            </Link>
            <Link 
              href="/legal/commercial-disclosure" 
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              特定商取引法に基づく表記
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}