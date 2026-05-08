import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import LoginModal from '../components/Auth/LoginModal'

export default function Login() {
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector(state => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-gold/20 flex items-center justify-center py-12 px-4">
      <LoginModal isOpen={true} onClose={() => navigate('/')} />
    </div>
  )
}
