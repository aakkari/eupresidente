// O Supabase responde em ingles. Numa tela em que a pessoa acabou de gastar
// doze minutos, "User already registered" e um beco sem saida: nao diz o que
// fazer. Cada mensagem aqui termina com a acao seguinte.
export function emPortugues(msg) {
  const m = String(msg ?? '')
  if (/already registered|already been registered/i.test(m))
    return 'Esse e-mail já tem conta aqui. Toque em "Já tenho conta" e entre com sua senha.'
  if (/invalid login credentials/i.test(m))
    return 'E-mail ou senha não conferem. Se a conta é nova, toque em "Criar uma conta".'
  if (/password should be at least|password.*6/i.test(m))
    return 'A senha precisa de pelo menos 6 caracteres.'
  if (/unable to validate email|invalid email|valid email/i.test(m))
    return 'Confira o e-mail: parece que falta alguma coisa.'
  if (/rate limit|too many requests|for security purposes/i.test(m))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo — suas respostas já estão salvas.'
  if (/email not confirmed/i.test(m))
    return 'Esta conta ainda não foi confirmada. Procure o e-mail de confirmação.'
  if (/failed to fetch|network/i.test(m))
    return 'A conexão caiu no meio. Tente de novo — suas respostas já estão salvas.'
  return m
}
