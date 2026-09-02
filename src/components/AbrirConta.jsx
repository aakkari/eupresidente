import { useState } from 'react'
import BotaoGoogle from './BotaoGoogle.jsx'

// Conta criada na tela final do questionario, e nao na primeira pergunta.
//
// Pedir nome e e-mail antes da pergunta 1 parece inofensivo e nao e: e um
// pedagio cobrado antes de qualquer valor, no assunto em que a pessoa mais
// hesita em se identificar. Aqui e o contrario — ela ja gastou doze minutos,
// o resultado esta pronto do outro lado do botao, e a conta virou o caminho
// mais curto ate ele em vez de um obstaculo no caminho.
export default function AbrirConta({ enviando, erro, onEnviar, googleVoltaPara, googleAntes }) {
  const [modo, setModo] = useState('criar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const criar = modo === 'criar'
  // Senha digitada errada aqui e uma conta que a pessoa nunca mais abre: nao
  // ha e-mail de recuperacao ligado ainda, e o resultado fica dentro dela.
  // Por isso o segundo campo — e por isso o erro aparece antes de enviar.
  const naoBate = criar && repetida.length > 0 && senha !== repetida

  function enviar(e) {
    e.preventDefault()
    if (naoBate || (criar && senha !== repetida)) return
    onEnviar({ modo, nome: nome.trim(), email: email.trim().toLowerCase(), senha })
  }

  return (
    <form onSubmit={enviar} className="cartao mt-6 p-5">
      <h3 className="subtitulo text-xl">
        {criar ? 'Seu resultado está pronto' : 'Entre na sua conta'}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-grafia">
        {criar
          ? 'Falta abrir sua conta para ver. É gratuita, leva quinze segundos, e é ela que guarda o resultado — para você voltar quando quiser, comparar com amigos e responder de novo daqui a um tempo.'
          : 'Entre e o resultado abre na sua conta.'}
      </p>

      {/* Primeiro o Google, depois o formulario. Um toque contra tres campos:
          quem tem conta Google nunca deveria ver os tres. */}
      {criar && (
        <div className="mt-4">
          <BotaoGoogle voltarPara={googleVoltaPara} aoIr={googleAntes} desabilitado={enviando} />
        </div>
      )}

      {criar && (
        <input className={`campo ${criar ? '' : 'mt-4'}`} placeholder="nome completo" value={nome} required
               minLength={2} maxLength={60} autoComplete="name"
               onChange={e => setNome(e.target.value)} />
      )}
      <input className="campo mt-2" type="email" placeholder="seu e-mail"
             value={email} required autoComplete="email"
             onChange={e => setEmail(e.target.value)} />
      <input className="campo mt-2" type="password" value={senha} required minLength={6}
             placeholder={criar ? 'crie uma senha' : 'sua senha'}
             autoComplete={criar ? 'new-password' : 'current-password'}
             onChange={e => setSenha(e.target.value)} />
      {criar && (
        <input className={`campo mt-2 ${naoBate ? 'border-red-600' : ''}`} type="password"
               value={repetida} required minLength={6} placeholder="repita a senha"
               autoComplete="new-password" onChange={e => setRepetida(e.target.value)} />
      )}

      {/* A regra visivel antes de digitar, e nao depois de errar. So o que e
          sempre verdade: o minimo de caracteres. O resto o servidor decide, e
          a mensagem dele chega traduzida. */}
      {criar && !naoBate && (
        <p className="mt-2 text-xs leading-relaxed text-grafia">
          Mínimo de 6 caracteres. Evite as óbvias, como 123456 ou o seu nome.
        </p>
      )}
      {naoBate && <p className="mt-2 text-sm text-red-700">As duas senhas estão diferentes.</p>}
      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

      <button className="botao-forte mt-4 w-full disabled:opacity-40"
              disabled={enviando || naoBate || (criar && !repetida)}>
        {enviando ? 'Calculando...'
          : criar ? 'Abra sua conta gratuita para ver seu resultado'
          : 'Entrar e ver meu resultado'}
      </button>

      {/* Nao existe "ver sem conta". O resultado e o gatilho da conta, e este
          e o unico instante em que ele vale alguma coisa para quem acabou de
          responder. A unica outra porta e para quem ja tem conta — isso nao e
          escapar, e entrar pela porta certa. */}
      <button type="button" disabled={enviando} className="mt-4 w-full text-sm text-grafia hover:text-tinta"
              onClick={() => { setModo(criar ? 'entrar' : 'criar'); setRepetida('') }}>
        {criar ? 'Já tenho conta' : 'Criar uma conta'}
      </button>

      <p className="mt-5 text-xs leading-relaxed text-grafia">
        Suas respostas já estão salvas. Sua opinião política é dado sensível: a conta guarda
        seu resultado e nada mais — nada vai para a base de pesquisa sem você autorizar,
        separadamente.
      </p>
    </form>
  )
}
