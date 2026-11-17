import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR code de verdade (código da reserva ou Pix copia-e-cola), desenhado em carvão. */
export function QR({ value, size = 150, label }: { value: string; size?: number; label?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let vivo = true;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#2a221c', light: '#ffffff' } })
      .then((s) => { if (vivo) setSvg(s); })
      .catch(() => setSvg(''));
    return () => { vivo = false; };
  }, [value]);
  return (
    <div className="qr" style={{ width: size, height: size }} role="img" aria-label={label ?? value}>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
