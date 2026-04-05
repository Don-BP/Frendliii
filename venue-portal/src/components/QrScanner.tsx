import { useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Props {
  onSuccess: (code: string) => void
  onError?: (message: string) => void
}

export function QrScanner({ onSuccess, onError }: Props) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    )

    scanner.render(
      (decodedText: string) => {
        onSuccess(decodedText)
      },
      () => {
        // Suppress per-frame scan errors — these fire constantly during scanning
      }
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [onSuccess])

  return <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" />
}
