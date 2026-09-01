export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Preto e branco por decisao politica, nao so estetica: um instrumento
        // que se quer neutro nao pode ter identidade vermelha nem azul. A
        // pessoa le o viés antes de ler o texto.
        tinta:  '#0a0a0b',
        papel:  '#fafafa',
        borda:  '#e4e4e4',
        grafia: '#6b6b70',
        tenue:  '#a3a3a8',
      },
      fontFamily: {
        // Sem serifa em tudo. A hierarquia vem de peso, tamanho e tracking.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        apertado: '-0.03em',
        muito: '-0.045em',
      },
    },
  },
  plugins: [],
}
