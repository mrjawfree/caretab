import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCareRecipients } from '../contexts/CareRecipientContext'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
  onSignOut: () => void
  showBack?: boolean
}

export function Header({ user, onSignOut, showBack }: HeaderProps) {
  const navigate = useNavigate()
  const { activeRecipient, allRecipients, setActiveRecipientId } = useCareRecipients()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSwitch = (id: string) => {
    setActiveRecipientId(id)
    setOpen(false)
    navigate(`/recipient/${id}`)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => {
              setActiveRecipientId(null)
              navigate('/')
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <h1
          className="text-xl font-bold text-indigo-600 cursor-pointer"
          onClick={() => {
            setActiveRecipientId(null)
            navigate('/')
          }}
        >
          CareTab
        </h1>

        {activeRecipient && allRecipients.length > 1 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="max-w-[120px] truncate">{activeRecipient.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Switch recipient
                </div>
                {allRecipients.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSwitch(r.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                      r.id === activeRecipient.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div>
                      <span>{r.name}</span>
                      {r.relationship && (
                        <span className="text-xs text-gray-400 ml-1.5">({r.relationship})</span>
                      )}
                    </div>
                    {r.id === activeRecipient.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeRecipient && allRecipients.length === 1 && (
          <span className="text-sm font-medium text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
            {activeRecipient.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
        <button onClick={onSignOut} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          Sign out
        </button>
      </div>
    </header>
  )
}
