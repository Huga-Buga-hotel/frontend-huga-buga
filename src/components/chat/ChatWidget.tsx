import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/endpoints';
import { useLang } from '../../hooks';
import { Icon, Ring } from '../ui/basics';
import { mmss } from '../../lib/format';

interface Msg { de: 'eu' | 'bugao' | 'erro'; texto: string }
const K_SESSAO = 'hb.chat.sessao';
const K_MSGS = 'hb.chat.msgs';

function novaSessao() {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
  try { sessionStorage.setItem(K_SESSAO, id); sessionStorage.removeItem(K_MSGS); } catch { /* ignore */ }
  return id;
}

/** Chat com o Bugão (chatbot do hotel): texto e áudio. */
export default function ChatWidget({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();
  const [sessao, setSessao] = useState(() => { try { return sessionStorage.getItem(K_SESSAO) ?? novaSessao(); } catch { return novaSessao(); } });
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(K_MSGS) ?? '[]') as Msg[]; } catch { return []; } });
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [seg, setSeg] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const fim = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { sessionStorage.setItem(K_MSGS, JSON.stringify(msgs.slice(-40))); } catch { /* ignore */ } fim.current?.scrollIntoView({ block: 'end' }); }, [msgs, pensando]);
  useEffect(() => { input.current?.focus(); const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, [onClose]);
  useEffect(() => { if (!gravando) return; const id = setInterval(() => setSeg((s) => s + 1), 1000); return () => clearInterval(id); }, [gravando]);

  const falhou = () => setMsgs((m) => [...m, { de: 'erro', texto: t('chat.indisponivel') }]);

  const enviar = async (msg: string) => {
    const m = msg.trim();
    if (!m || pensando) return;
    setTexto('');
    setMsgs((l) => [...l, { de: 'eu', texto: m }]);
    setPensando(true);
    try {
      const r = await api.chat.texto(m.slice(0, 1000), sessao);
      setMsgs((l) => [...l, { de: 'bugao', texto: r.resposta }]);
    } catch { falhou(); } finally { setPensando(false); }
  };

  const gravar = async () => {
    if (gravando) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      partes.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) partes.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setGravando(false);
        const blob = new Blob(partes.current, { type: mr.mimeType || 'audio/webm' });
        if (blob.size < 800) return;
        setPensando(true);
        try {
          const r = await api.chat.audio(blob, sessao, lang.slice(0, 2));
          setMsgs((l) => [...l, { de: 'eu', texto: t('chat.transcricao', { texto: r.transcricao }) }, { de: 'bugao', texto: r.resposta }]);
        } catch { falhou(); } finally { setPensando(false); }
      };
      rec.current = mr;
      setSeg(0);
      mr.start();
      setGravando(true);
    } catch {
      setMsgs((l) => [...l, { de: 'erro', texto: t('chat.semMicrofone') }]);
    }
  };

  const limpar = () => {
    void api.chat.encerrar(sessao).catch(() => {});
    setSessao(novaSessao());
    setMsgs([]);
  };

  const sugestoes = t('chat.sugestoes', { returnObjects: true }) as string[];
  const podeGravar = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices;

  return createPortal(
    <div className="chat" role="dialog" aria-label={t('chat.titulo')}>
      <div className="chat__head tx-caverna">
        <span className="chat-fab__icon" style={{ width: 38, height: 38 }}><Icon name="forum" /></span>
        <div className="grow">
          <div style={{ font: "900 22px/1 'Londrina Solid',sans-serif" }}>{t('chat.titulo')}</div>
          <div style={{ fontSize: 12, color: 'var(--osso-2)' }}>{t('chat.subtitulo')}</div>
        </div>
        <button onClick={limpar} aria-label={t('chat.limpar')} title={t('chat.limpar')}><Icon name="restart_alt" /></button>
        <button onClick={onClose} aria-label={t('comum.fechar')}><Icon name="close" /></button>
      </div>
      <div className="chat__msgs" aria-live="polite">
        <div className="chat__msg chat__msg--bugao">{t('chat.boasVindas')}</div>
        {msgs.map((m, i) => <div key={i} className={`chat__msg chat__msg--${m.de}`}>{m.texto}</div>)}
        {pensando && <div className="chat__msg chat__msg--bugao row" style={{ gap: 8 }}><Ring style={{ color: 'var(--fogo)', width: 14, height: 14 }} />{t('chat.pensando')}</div>}
        {msgs.length === 0 && (
          <div className="chips" style={{ marginTop: 4 }}>
            {sugestoes.map((s) => <button key={s} className="chip chip--s" onClick={() => void enviar(s)}>{s}</button>)}
          </div>
        )}
        <div ref={fim} />
      </div>
      <form className="chat__form" onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}>
        {gravando ? (
          <div className="grow row" style={{ gap: 8, fontWeight: 700, color: 'var(--barro-erro)' }}><span className="chat__rec" />{t('chat.gravando', { tempo: mmss(seg) })}</div>
        ) : (
          <textarea ref={input} className="chat__input" rows={1} value={texto} maxLength={1000} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')}
            onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }} />
        )}
        {podeGravar && (
          <button type="button" className={`chat__btn ${gravando ? 'is-rec' : ''}`} onClick={() => void gravar()} aria-label={gravando ? t('chat.parar') : t('chat.gravar')} title={gravando ? t('chat.parar') : t('chat.gravar')} disabled={pensando}>
            <Icon name={gravando ? 'stop' : 'mic'} />
          </button>
        )}
        {!gravando && <button type="submit" className="chat__btn chat__btn--fogo" aria-label={t('chat.enviar')} disabled={!texto.trim() || pensando}><Icon name="send" /></button>}
      </form>
    </div>,
    document.body,
  );
}
