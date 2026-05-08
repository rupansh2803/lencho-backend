export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export function LoadingSpinner() {
  return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
}

export function ErrorMessage({ message, onClose }) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 font-bold">×</button>
      )}
    </div>
  )
}

export function SuccessMessage({ message }) {
  return (
    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {message}
    </div>
  )
}
