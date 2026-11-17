import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../ui/basics';
import { DatasSheet, TriboSheet } from './Pickers';
import { buscaParaParams, useBusca } from '../../context/busca';
import { useLang, useTriboTexto } from '../../hooks';
import { dataCurta, intervalo } from '../../lib/format';
import type { CategoriaCaverna } from '../../api/types';

const CATS: CategoriaCaverna[] = ['FAMILIA', 'CASAL', 'AMIGOS', 'GRUPO'];

/** "Tábua" de busca da home: desktop em colunas; no mobile vira tábua empilhada. */
export function SearchBoard() {
  const { t, lang } = useLang();
  const { busca, setBusca, noites } = useBusca();
  const tribo = useTriboTexto();
  const nav = useNavigate();
  const [datas, setDatas] = useState(false);
  const [quem, setQuem] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const buscar = () => {
    setBuscando(true);
    nav(`/cavernas?${buscaParaParams(busca)}`);
  };
  const cat = busca.categoria[0] ?? '';

  return (
    <>
      {/* desktop */}
      <div className="board hide-mobile">
        <button type="button" className="board__col" onClick={() => setDatas(true)}>
          <span className="caption">{t('busca.chegada')}</span>
          <span className="board__val"><Icon name="calendar_month" />{dataCurta(busca.checkIn, lang)}</span>
        </button>
        <button type="button" className="board__col" onClick={() => setDatas(true)}>
          <span className="caption">{t('busca.partida')}</span>
          <span className="board__val"><Icon name="calendar_month" />{dataCurta(busca.checkOut, lang)}</span>
        </button>
        <button type="button" className="board__col" onClick={() => setQuem(true)}>
          <span className="caption">{t('busca.tamanhoTribo')}</span>
          <span className="board__val"><Icon name="groups" />{tribo(busca.adultos, busca.idadesCriancas.length)}</span>
        </button>
        <label className="board__col board__col--last">
          <span className="caption">{t('busca.tipoCaverna')}</span>
          <span className="board__val">
            <Icon name="cabin" />
            <select
              className="board__select"
              value={cat}
              onChange={(e) => setBusca({ categoria: e.target.value ? [e.target.value as CategoriaCaverna] : [] })}
              aria-label={t('busca.tipoCaverna')}
            >
              <option value="">{t('busca.todas')}</option>
              {CATS.map((c) => <option key={c} value={c}>{t(`comum.categoria.${c}`)}</option>)}
            </select>
            <Icon name="expand_more" style={{ color: 'var(--pedra)', marginLeft: -26, pointerEvents: 'none' }} />
          </span>
        </label>
        <Button variant="carvao" size="lg" icon="search" onClick={buscar} loading={buscando} loadingKind="feet" loadingText={t('busca.farejando')} style={{ padding: '16px 26px' }}>
          {t('busca.buscar')}
        </Button>
      </div>

      {/* mobile */}
      <div className="board-m only-mobile">
        <button type="button" className="board-m__row" onClick={() => setDatas(true)}>
          <Icon name="calendar_month" />
          <span><span className="caption caption--s">{t('busca.datas')}</span><b>{intervalo(busca.checkIn, busca.checkOut, lang)} · {t('comum.noites', { count: noites })}</b></span>
        </button>
        <button type="button" className="board-m__row" onClick={() => setQuem(true)}>
          <Icon name="groups" />
          <span><span className="caption caption--s">{t('busca.tribo')}</span><b>{tribo(busca.adultos, busca.idadesCriancas.length)}</b></span>
        </button>
        <Button variant="carvao" block onClick={buscar} loading={buscando} loadingKind="feet" loadingText={t('busca.farejando')} style={{ boxShadow: '0 3px 0 #000', borderRadius: 'var(--r-m2)' }}>
          {t('busca.buscar')}
        </Button>
      </div>

      <DatasSheet open={datas} onClose={() => setDatas(false)} checkIn={busca.checkIn} checkOut={busca.checkOut} onConfirm={(a, b) => setBusca({ checkIn: a, checkOut: b })} />
      <TriboSheet open={quem} onClose={() => setQuem(false)} adultos={busca.adultos} idades={busca.idadesCriancas} onConfirm={(a, i) => setBusca({ adultos: a, idadesCriancas: i })} />
    </>
  );
}
