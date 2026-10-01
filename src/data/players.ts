// Jogadores que giram nos rolos. Para adicionar mais, basta incluir novos itens na lista.
// IMPORTANTE: o "name" precisa ser único, ele é usado para salvar o álbum.
type Player = {
  name: string;
  number: string;
  description: string;
  reel: string;
  win: string;
  winPreview?: string;
  winPreviewMs?: number;
};

export const PLAYERS: Player[] = [
  {
    name: "Cauê", number: "10", description: "Jogador de rara precisão, raramente precisam dele.",
    reel: "/players/reel/caue.png",   win: "/players/win/caue.jpeg",
  },
  {
    name: "Israel", number: "14", description: "Esse é nosso menino talento:Tá lento na defesa, tá lento no meio, tá lento no ataque",
    reel: "/players/reel/israel.png", win: "/players/win/israel.jpeg",
  },
  {
    name: "Lucca", number: "07", description: "Jogador que busca um ano melhor que ano passado…Só precisa de um gol",
    reel: "/players/reel/lucca.png",  win: "/players/win/lucca.png",
  },
  {
    name: "Caixeta", number: "07", description: "Jogador que veio do zero e tá lá até hoje",
    reel: "/players/reel/caixeta.png",  win: "/players/win/caixeta.png",
    winPreview: "/players/win/cruxen.png", winPreviewMs: 500,
  },
  {
    name: "Rafa", number: "07", description: "Se talento vem de berço, esse aí dormia no chão.",
    reel: "/players/reel/rafa.png",  win: "/players/win/rafa.png",
  },
  {
    name: "Lucas", number: "01", description: "Jogador que tá virando influencer! Tá influenciando bastante nas derrotas",
    reel: "/players/reel/flu.png",  win: "/players/win/flu.png",
  },
];