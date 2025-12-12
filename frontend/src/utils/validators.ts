// frontend/src/utils/validators.ts

export const mascaraCPF = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo que não é número
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto depois do 3º digito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto depois do 6º digito
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca traço depois do 9º digito
    .replace(/(-\d{2})\d+?$/, '$1'); // Impede digitar mais que 11 números
};

export const mascaraCEP = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove letras
    .replace(/^(\d{5})(\d)/, '$1-$2') // Adiciona o traço após o 5º número
    .slice(0, 9); // Limita o tamanho (5 números + 1 traço + 3 números)
};


export function validarCPF(cpf: string): boolean {
  // Remove tudo que não é dígito (pontos e traços)
  cpf = cpf.replace(/[^\d]+/g, '');

  // Verifica tamanho padrão e se todos os dígitos são iguais (ex: 111.111.111-11)
  if (cpf === '' || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let soma = 0;
  let resto;

  // Validação do 1º Dígito Verificador
  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  // Validação do 2º Dígito Verificador
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;

  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}