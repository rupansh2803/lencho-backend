import { useState } from 'react'

export default function Footer() {
  const [expandedSection, setExpandedSection] = useState(null)

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const sections = [
    {
      id: 'quick-links',
      title: 'Quick Links',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/products' },
        { label: 'Orders', href: '/orders' },
        { label: 'Contact', href: '/contact' }
      ]
    },
    {
      id: 'support',
      title: 'Customer Care',
      links: [
        { label: 'My Account', href: '/profile' },
        { label: 'My Cart', href: '/cart' },
        { label: 'Wishlist', href: '/wishlist' },
        { label: 'Returns & Refunds', href: '/' },
        { label: 'Size Guide', href: '/' }
      ]
    },
    {
      id: 'contact',
      title: 'Contact Us',
      content: (
        <div className="space-y-3 text-gray-400 text-sm">
          <div>
            <p className="text-white font-semibold mb-1">📞 Phone</p>
            <a href="tel:+917404217625" className="hover:text-gold transition">
              +91 7404217625
            </a>
          </div>
          <div>
            <p className="text-white font-semibold mb-1">✉️ Email</p>
            <a
              href="mailto:lencho.official01@gmail.com"
              className="hover:text-gold transition break-all"
            >
              lencho.official01@gmail.com
            </a>
          </div>
        </div>
      )
    }
  ]

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white mt-16 py-12 px-4 sm:px-6 md:px-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h4 className="text-xl font-bold mb-4 text-gold">✨ Lencho</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium artificial jewellery crafted with elegance and style for every occasion.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition"
              >
                f
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition"
              >
                𝕏
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition"
              >
                📷
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="/" className="hover:text-gold transition">
                  Home
                </a>
              </li>
              <li>
                <a href="/products" className="hover:text-gold transition">
                  Shop
                </a>
              </li>
              <li>
                <a href="/orders" className="hover:text-gold transition">
                  Orders
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-gold transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-4">Customer Care</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="/profile" className="hover:text-gold transition">
                  My Account
                </a>
              </li>
              <li>
                <a href="/cart" className="hover:text-gold transition">
                  My Cart
                </a>
              </li>
              <li>
                <a href="/wishlist" className="hover:text-gold transition">
                  Wishlist
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-gold transition">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-gold transition">
                  Size Guide
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">Contact Us</h4>
            <div className="space-y-3 text-gray-400 text-sm">
              <div>
                <p className="text-white font-semibold mb-1">📞 Phone</p>
                <a href="tel:+917404217625" className="hover:text-gold transition">
                  +91 7404217625
                </a>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">✉️ Email</p>
                <a
                  href="mailto:lencho.official01@gmail.com"
                  className="hover:text-gold transition break-all text-xs"
                >
                  lencho.official01@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Accordion Layout */}
        <div className="md:hidden space-y-3 mb-8">
          {/* About Mobile */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-lg font-bold mb-3 text-gold">✨ Lencho</h4>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              Premium artificial jewellery crafted with elegance and style for every occasion.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition text-sm"
              >
                f
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition text-sm"
              >
                𝕏
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center hover:bg-gold/40 transition text-sm"
              >
                📷
              </a>
            </div>
          </div>

          {/* Accordion Sections */}
          {sections.map(section => (
            <div
              key={section.id}
              className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gold/10 transition"
              >
                <h4 className="text-lg font-bold text-white">{section.title}</h4>
                <span
                  className={`text-xl text-gold transition transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* Content */}
              {expandedSection === section.id && (
                <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/30 animate-in fade-in slide-in-from-top-2 duration-200">
                  {section.content ? (
                    section.content
                  ) : (
                    <ul className="space-y-3 text-gray-400 text-sm">
                      {section.links.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link.href}
                            className="hover:text-gold transition font-medium"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <hr className="border-gray-700 my-8" />

        {/* Footer Bottom */}
        <div className="space-y-4">
          {/* Links */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 text-xs sm:text-sm text-gray-400 flex-wrap">
            <a href="/" className="hover:text-gold transition">
              Privacy Policy
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="/" className="hover:text-gold transition">
              Terms & Conditions
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="/" className="hover:text-gold transition">
              Shipping Policy
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="/" className="hover:text-gold transition">
              Return Policy
            </a>
          </div>

          {/* Copyright */}
          <p className="text-center text-gray-400 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} Lencho. All rights reserved. Made with ❤️ in India
          </p>
        </div>
      </div>
    </footer>
  )
}
