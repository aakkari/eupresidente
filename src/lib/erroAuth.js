// O Supabase responde em ingles. Numa tela em que a pessoa acabou de gastar
// doze minutos, "User already registered" e um beco sem saida: nao diz o que
// fazer. Cada mensagem aqui termina com a acao seguinte.
export function emPortugues(msg) {
  const m = String(msg ?? '')
  if (/already registered|already been registered/i.test(m))
    return 'Esse e-mail já tem conta aqui. Toque em "Já tenho conta" e entre com sua senha.'
  if (/invalid login credentials/i.test(m))
    return 'E-mail ou senha não conferem. Se a conta é nova, toque em "Criar uma conta".'
  // O Supabase recusa senha que aparece em vazamentos conhecidos, e devolve
  // "Password is known to be weak and easy to guess". Em ingles, num campo de
  // senha, isso parece erro do site — a pessoa tenta de novo igual e desiste.
  //
  // A traducao nao repete o motivo. Dizer "essa senha ja apareceu em
  // vazamentos" soa como se tivessemos ido olhar alguma coisa da pessoa, e no
  // instante em que ela esta abrindo conta isso assusta sem ajudar em nada —
  // o que ela precisa saber e o que fazer agora, nao de onde veio a recusa.
  if (/known to be weak|easy to guess|weak.?password/i.test(m))
    return 'Por segurança, escolha uma senha mais difícil: misture letras e números e evite sequências ou palavras comuns.'
  if (/should contain at least one character of each|does not meet.*requirements/i.test(m))
    return 'Essa senha não atende às regras: use letras e números.'
  const curta = m.match(/at least (\d+) characters/i)
  if (curta) return `A senha precisa de pelo menos ${curta[1]} caracteres.`
  if (/password should be at least/i.test(m))
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
