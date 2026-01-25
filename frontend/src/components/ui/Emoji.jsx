/**
 * Emoji - Componente acessível para emojis
 *
 * Adiciona aria-label para screen readers poderem ler o significado do emoji.
 *
 * @param {string} symbol - O caractere emoji
 * @param {string} label - Descrição do emoji para screen readers
 */
export default function Emoji({ symbol, label }) {
  return (
    <span role="img" aria-label={label} title={label}>
      {symbol}
    </span>
  )
}

/**
 * Emojis comuns do Zeni com labels pré-definidos
 */
export const ZeniEmojis = {
  chart: <Emoji symbol="📊" label="Gráfico de barras" />,
  money: <Emoji symbol="💰" label="Dinheiro" />,
  target: <Emoji symbol="🎯" label="Alvo" />,
  fire: <Emoji symbol="🔥" label="Fogo, sequência ativa" />,
  star: <Emoji symbol="⭐" label="Estrela" />,
  trophy: <Emoji symbol="🏆" label="Troféu" />,
  warning: <Emoji symbol="⚠️" label="Atenção" />,
  check: <Emoji symbol="✅" label="Concluído" />,
  calendar: <Emoji symbol="📅" label="Calendário" />,
  piggy: <Emoji symbol="🐷" label="Cofrinho" />,
  rocket: <Emoji symbol="🚀" label="Foguete" />,
  lightbulb: <Emoji symbol="💡" label="Ideia" />,
  thumbsUp: <Emoji symbol="👍" label="Positivo" />,
  clap: <Emoji symbol="👏" label="Aplausos" />,
  party: <Emoji symbol="🎉" label="Celebração" />,
  thinking: <Emoji symbol="🤔" label="Pensando" />,
  sad: <Emoji symbol="😔" label="Triste" />,
  happy: <Emoji symbol="😊" label="Feliz" />,
  wave: <Emoji symbol="👋" label="Acenando" />,
}
