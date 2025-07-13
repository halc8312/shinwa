import { ToastType } from '@/lib/contexts/ToastContext'

export function showToast(
  addToast: (message: string, type?: ToastType, duration?: number) => void,
  message: string,
  type: ToastType = 'info',
  duration: number = 5000
) {
  addToast(message, type, duration)
}

export function showSuccessToast(
  addToast: (message: string, type?: ToastType, duration?: number) => void,
  message: string
) {
  showToast(addToast, message, 'success')
}

export function showErrorToast(
  addToast: (message: string, type?: ToastType, duration?: number) => void,
  message: string
) {
  showToast(addToast, message, 'error')
}

export function showWarningToast(
  addToast: (message: string, type?: ToastType, duration?: number) => void,
  message: string
) {
  showToast(addToast, message, 'warning')
}

export function showInfoToast(
  addToast: (message: string, type?: ToastType, duration?: number) => void,
  message: string
) {
  showToast(addToast, message, 'info')
}