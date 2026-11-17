import { describe, expect, it } from 'vitest';
import {
  adultosCobrados, bandeira, cartaoMascarado, cpfOk, emailOk, estimarDiarias, faixaIdade, forcaSenha,
  formatarCartao, formatarCelular, formatarCpf, formatarValidade, luhn, pessoasNaCapacidade, seloStatus,
  validadeOk, valorComPix, valorParcela,
} from '../regras';

describe('faixas de idade', () => {
  it('até 5 anos é grátis, 6–12 é criança, acima de 12 é adulto', () => {
    expect(faixaIdade(0)).toBe('gratis');
    expect(faixaIdade(5)).toBe('gratis');
    expect(faixaIdade(6)).toBe('crianca');
    expect(faixaIdade(12)).toBe('crianca');
    expect(faixaIdade(13)).toBe('adulto');
  });

  it('criança acima de 12 é cobrada como adulto', () => {
    expect(adultosCobrados(2, [4, 9, 14])).toBe(3);
  });

  it('criança de até 5 anos não conta na capacidade', () => {
    expect(pessoasNaCapacidade(2, [3, 7])).toBe(3);
    expect(pessoasNaCapacidade(2, [])).toBe(2);
  });
});

describe('estimativa de diárias', () => {
  it('2 adultos inclusos: só a diária × noites', () => {
    expect(estimarDiarias(52000, 3, 2, [8])).toBe(156000);
  });

  it('cada adulto além de 2 soma R$ 60/noite', () => {
    // 3 adultos + criança de 13 = 4 cobrados → 2 extras
    expect(estimarDiarias(52000, 2, 3, [13])).toBe((52000 + 2 * 6000) * 2);
  });
});

describe('pagamento', () => {
  it('Pix aplica 5% de desconto arredondado', () => {
    expect(valorComPix(100000)).toBe(95000);
    expect(valorComPix(161100)).toBe(153045);
  });

  it('parcela arredonda igual ao backend', () => {
    expect(valorParcela(161100, 3)).toBe(53700);
    expect(valorParcela(100000, 1)).toBe(100000);
    expect(valorParcela(100001, 2)).toBe(50001);
  });
});

describe('cartão (simulado)', () => {
  it('valida Luhn', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111 1111 1111 1112')).toBe(false);
    expect(luhn('4111')).toBe(false);
  });

  it('identifica a bandeira', () => {
    expect(bandeira('4111')).toBe('VISA');
    expect(bandeira('5500')).toBe('MASTERCARD');
    expect(bandeira('3714')).toBe('AMEX');
    expect(bandeira('6011')).toBe('OUTRA');
  });

  it('formata e mascara o número', () => {
    expect(formatarCartao('4821111122227730')).toBe('4821 1111 2222 7730');
    expect(cartaoMascarado('4821111122227730')).toBe('4821 •••• •••• 7730');
  });

  it('formata e valida a validade', () => {
    expect(formatarValidade('0829')).toBe('08/29');
    expect(formatarValidade('1')).toBe('1');
    const hoje = new Date(2026, 10, 16);
    expect(validadeOk('11/26', hoje)).toBe(true);
    expect(validadeOk('10/26', hoje)).toBe(false);
    expect(validadeOk('13/30', hoje)).toBe(false);
    expect(validadeOk('1230', hoje)).toBe(false);
  });
});

describe('senha', () => {
  it('pedra lascada → pedra polida → diamante', () => {
    expect(forcaSenha('')).toBe(0);
    expect(forcaSenha('abc123')).toBe(1);
    expect(forcaSenha('abcdefgh')).toBe(2);
    expect(forcaSenha('Mamute2026!')).toBe(3);
  });
});

describe('documentos e contato', () => {
  it('valida e-mail', () => {
    expect(emailOk('tribo@hugabuga.com')).toBe(true);
    expect(emailOk('  tribo@hugabuga.com ')).toBe(true);
    expect(emailOk('tribohugabuga.com')).toBe(false);
    expect(emailOk('tribo@huga')).toBe(false);
  });

  it('valida CPF pelos dígitos verificadores', () => {
    expect(cpfOk('529.982.247-25')).toBe(true);
    expect(cpfOk('529.982.247-24')).toBe(false);
    expect(cpfOk('111.111.111-11')).toBe(false);
    expect(cpfOk('123')).toBe(false);
  });

  it('formata CPF e celular enquanto digita', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('5299')).toBe('529.9');
    expect(formatarCelular('54912345678')).toBe('(54) 9 1234-5678');
    expect(formatarCelular('54')).toBe('(54');
  });
});

describe('selo de status', () => {
  it('mapeia status da reserva para a cor do selo', () => {
    expect(seloStatus('CONFIRMADA')).toBe('ok');
    expect(seloStatus('AGUARDANDO_PAGAMENTO')).toBe('wait');
    expect(seloStatus('EXPIRADA')).toBe('err');
    expect(seloStatus('CONCLUIDA')).toBe('info');
  });
});
