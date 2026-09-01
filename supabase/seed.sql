-- EU PRESIDENTE — seed do instrumento v1
-- Nasce com active = false. Publique so depois de revisar o texto das
-- perguntas: a partir do momento em que ficar ativo, mudanca exige v2
-- (ver decisao 8 no CLAUDE.md). Para ativar:
--     update instruments set active = true where id = 'br-v1';

insert into instruments (id, label, axes, axis_weights, active) values (
'br-v1',
'Eu Presidente — Brasil, versão 1',
'{
  "ECO": {"nome":"Economia",   "neg":"Estado coordena",       "pos":"Mercado coordena"},
  "SOC": {"nome":"Costumes",   "neg":"Tradição preserva",     "pos":"Autonomia individual"},
  "AUT": {"nome":"Autoridade", "neg":"Liberdade civil",       "pos":"Ordem e coerção"},
  "NAC": {"nome":"Nação e mundo",  "neg":"Integração global",     "pos":"Soberania nacional"},
  "DEM": {"nome":"Democracia",      "neg":"Instituições e freios", "pos":"Vontade popular direta"},
  "AMB": {"nome":"Meio ambiente",  "neg":"Crescimento hoje",      "pos":"Sustentabilidade longa"}
}'::jsonb,
'{"ECO":1.0,"SOC":1.0,"AUT":1.0,"NAC":0.9,"DEM":1.0,"AMB":0.9}'::jsonb,
false);

-- ------------------------------------------------------------- arquetipos
-- centroide = posicao de referencia nos 6 eixos. O arquetipo da pessoa e o
-- centroide mais proximo (distancia euclidiana ponderada por axis_weights).
-- available_short = false: arquetipo que exige o eixo DEM ou AMB bem medido,
-- o que a versao de 15 perguntas nao entrega com confianca.

insert into archetypes (id, instrument_id, name, tagline, description, schools, centroid, available_short, color) values

('social_democrata','br-v1','Social-democrata',
 'Mercado com coleira curta e rede de proteção larga',
 'Aceita a economia de mercado como motor, mas não como árbitro. Defende Estado forte em saúde, educação e previdência, tributação progressiva e sindicato com poder real. Nos costumes é liberal; nas instituições, legalista. É a família política que construiu o Estado de bem-estar europeu do pós-guerra. Parentesco internacional: SPD alemão, trabalhismo britânico, social-democracia nórdica.',
 ARRAY['Eduard Bernstein','John Rawls','Gosta Esping-Andersen','Tony Judt'],
 '{"ECO":-0.6,"SOC":0.5,"AUT":-0.2,"NAC":-0.2,"DEM":-0.3,"AMB":0.5}'::jsonb, true, '#C0392B'),

('socialista_democratico','br-v1','Socialista democrático',
 'A desigualdade é o problema, não um efeito colateral',
 'Considera que a concentração de riqueza corrompe a própria democracia, e que corrigi-la exige mais que política social: exige mudar quem é dono do quê. Defende serviços públicos universais, forte tributação sobre patrimônio e ampliação da propriedade coletiva. Democrático no método, radical no objetivo. Parentesco internacional: Podemos, France Insoumise, ala de Sanders nos EUA.',
 ARRAY['Karl Marx','Rosa Luxemburgo','Thomas Piketty','Nancy Fraser'],
 '{"ECO":-0.9,"SOC":0.6,"AUT":-0.3,"NAC":0.0,"DEM":0.2,"AMB":0.6}'::jsonb, true, '#8E1B1B'),

('verde_ecossocial','br-v1','Verde ecossocial',
 'O prazo do planeta é mais curto que o do PIB',
 'Trata o limite ecológico como restrição dura, não como preferência. Aceita perder crescimento para não perder o sistema que sustenta a economia. Combina isso com pauta social progressista, poder local e desconfiança de grande escala — pública ou privada. No Brasil, cruza com a defesa de territórios indígenas como estratégia de conservação. Parentesco internacional: Verdes alemães, movimento climático europeu.',
 ARRAY['Arne Naess','Elinor Ostrom','Ailton Krenak','Kate Raworth'],
 '{"ECO":-0.5,"SOC":0.7,"AUT":-0.4,"NAC":-0.4,"DEM":0.1,"AMB":0.95}'::jsonb, false, '#1E8449'),

('liberal_progressista','br-v1','Liberal progressista',
 'Mercado livre, costumes livres, poder vigiado',
 'Confia no mercado para alocar e no indivíduo para escolher como viver. Defende abertura comercial, imigração e direitos individuais amplos, com Estado enxuto mas competente. Fortemente institucionalista: desconfia tanto de maioria quanto de líder. É o liberalismo no sentido clássico da palavra, não no uso brasileiro. Parentesco internacional: D66 holandês, LibDems britânicos, macronismo.',
 ARRAY['John Stuart Mill','John Rawls','Ronald Dworkin','Amartya Sen'],
 '{"ECO":0.4,"SOC":0.8,"AUT":-0.6,"NAC":-0.6,"DEM":-0.4,"AMB":0.4}'::jsonb, true, '#F1C40F'),

('libertario','br-v1','Libertário',
 'O Estado é o problema, quase sempre',
 'Parte do princípio de que coerção precisa de justificativa e quase nunca tem uma boa. Defende Estado mínimo, impostos baixos, e liberdade individual sem exceção — inclusive nas pautas que dividem esquerda e direita, como drogas e armas. Ceticismo simétrico: desconfia da regulação econômica e da regulação moral. Parentesco internacional: Cato Institute, movimento libertário argentino.',
 ARRAY['Ludwig von Mises','Friedrich Hayek','Robert Nozick','Murray Rothbard'],
 '{"ECO":0.95,"SOC":0.7,"AUT":-0.8,"NAC":-0.3,"DEM":-0.2,"AMB":-0.3}'::jsonb, true, '#E8A33D'),

('conservador_liberal','br-v1','Conservador liberal',
 'Liberdade econômica com freio cultural',
 'Defende mercado, propriedade e Estado pequeno, mas rejeita a ideia de que tudo deve mudar junto. Vê instituições, família e religião como capital acumulado que a sociedade não deveria gastar por moda. Ordem pública firme, mudança social lenta e testada. Parentesco internacional: Partido Conservador britânico, CDU alemã em sua ala liberal.',
 ARRAY['Edmund Burke','Michael Oakeshott','Friedrich Hayek','Roger Scruton'],
 '{"ECO":0.7,"SOC":-0.5,"AUT":0.4,"NAC":0.3,"DEM":-0.2,"AMB":-0.3}'::jsonb, true, '#2E5C8A'),

('democrata_cristao','br-v1','Social-cristão',
 'Nem o Estado nem o mercado: a comunidade',
 'Rejeita tanto o coletivismo estatal quanto o individualismo de mercado, e coloca a família e a comunidade como unidade central. Aceita Estado ativo em proteção social por dever moral, não por projeto igualitário. Conservador nos costumes, moderado no resto. É a matriz da doutrina social cristã e das democracias-cristãs europeias do pós-guerra.',
 ARRAY['Jacques Maritain','Konrad Adenauer','Doutrina Social da Igreja','Wilhelm Ropke'],
 '{"ECO":-0.1,"SOC":-0.6,"AUT":0.2,"NAC":0.1,"DEM":-0.3,"AMB":0.2}'::jsonb, true, '#7D6608'),

('comunitarista','br-v1','Comunitarista',
 'Não existe indivíduo solto no ar',
 'Discorda da premissa liberal de que a pessoa escolhe seus valores do zero: cada um nasce dentro de uma comunidade que já o formou. Defende decisão local, vínculo, pertencimento, e desconfia de solução universal imposta de cima — venha do Estado, do mercado ou de organismo internacional. Cruza pautas: pode ser progressista no ambiente e tradicional na família.',
 ARRAY['Michael Sandel','Charles Taylor','Alasdair MacIntyre','Elinor Ostrom'],
 '{"ECO":-0.3,"SOC":-0.2,"AUT":0.0,"NAC":0.2,"DEM":0.2,"AMB":0.5}'::jsonb, false, '#6C3483'),

('nacional_conservador','br-v1','Nacional-conservador',
 'Nação, ordem e continuidade, nesta ordem',
 'Coloca a soberania e a coesão nacional acima da abertura, e a ordem acima da liberdade quando as duas colidem. Defende fronteiras firmes, segurança dura e preservação dos costumes majoritários. Aceita Estado economicamente ativo se for a serviço do projeto nacional. Parentesco internacional: Fidesz húngaro, PiS polonês, direita nacionalista europeia.',
 ARRAY['Carl Schmitt','Yoram Hazony','Samuel Huntington','Oswald Spengler'],
 '{"ECO":0.1,"SOC":-0.8,"AUT":0.7,"NAC":0.8,"DEM":0.3,"AMB":-0.5}'::jsonb, true, '#1B3A5C'),

('nacional_popular','br-v1','Nacional-popular',
 'O povo contra quem manda',
 'Organiza a política como conflito entre o povo real e uma elite que o traiu — mídia, Judiciário, partidos, organismos internacionais. Combina proteção econômica e social com costumes tradicionais e autoridade forte. É uma gramática de poder mais que uma doutrina, e por isso aparece na esquerda e na direita. Parentesco internacional: peronismo, e o populismo contemporâneo em suas duas versões.',
 ARRAY['Ernesto Laclau','Chantal Mouffe','Juan Peron','Jan-Werner Muller (critica)'],
 '{"ECO":-0.4,"SOC":-0.5,"AUT":0.6,"NAC":0.9,"DEM":0.8,"AMB":-0.5}'::jsonb, true, '#943126'),

('nacional_desenvolvimentista','br-v1','Nacional-desenvolvimentista',
 'Indústria própria é o que separa país de colônia',
 'Vê o subdesenvolvimento como resultado da posição do país na divisão internacional do trabalho, não como atraso a ser corrigido pelo mercado. Defende Estado planejador, indústria nacional protegida, banco público e política externa autônoma. É a tradição econômica mais influente da história republicana brasileira.',
 ARRAY['Celso Furtado','Raul Prebisch','Friedrich List','Luiz Carlos Bresser-Pereira'],
 '{"ECO":-0.8,"SOC":0.1,"AUT":0.2,"NAC":0.7,"DEM":0.5,"AMB":-0.2}'::jsonb, false, '#117A65'),

('tecnocrata_centrista','br-v1','Tecnocrata',
 'A resposta certa não se decide por votação',
 'Confia em evidência, quadro técnico e instituição independente mais do que em disputa eleitoral. Pragmático nos eixos econômico e social — pega o que funciona de cada lado — mas fortemente contrário à decisão por maioria em matéria complexa. Defende banco central autônomo, agência reguladora forte e política pública avaliada por dado. Parentesco internacional: tecnocracia europeia, escola de política pública baseada em evidência.',
 ARRAY['Max Weber','Joseph Schumpeter','Esther Duflo','Mariana Mazzucato (critica)'],
 '{"ECO":0.2,"SOC":0.2,"AUT":0.1,"NAC":-0.3,"DEM":-0.8,"AMB":0.3}'::jsonb, false, '#5D6D7E');

-- --------------------------------------------------------------- perguntas
-- direction = -1 inverte a pergunta: concordar empurra para o polo negativo.
-- Metade de cada eixo e redigida na direcao oposta, para quebrar aquiescencia
-- (a tendencia de concordar com tudo, que e o vies mais comum em Likert).
-- 16 marcadas in_short compoem a versao viral, cobrindo os 6 eixos.

insert into questions (id, instrument_id, block, ord, axis, direction, weight, secondary_axis, secondary_weight, body, in_short, attention_pair) values

-- trabalho e renda
('t01','br-v1','trabalho',1,'ECO',-1,1.00,null,null,'O Estado deve ser dono das empresas de setores estratégicos, como energia e petróleo.',false,null),
('t02','br-v1','trabalho',2,'ECO', 1,0.90,null,null,'Reduzir impostos sobre empresas gera mais emprego do que programa público de geração de renda.',false,null),
('t03','br-v1','trabalho',3,'ECO',-1,0.90,null,null,'O salário mínimo deve subir acima da inflação mesmo que aumente o custo para quem emprega.',false,null),
('t04','br-v1','trabalho',4,'ECO', 1,1.00,null,null,'A lei trabalhista brasileira protege demais o empregado e trava a contratação.',true,null),
('t05','br-v1','trabalho',5,'ECO',-1,1.00,null,null,'Grandes fortunas devem pagar imposto sobre patrimônio, e não apenas sobre renda.',false,null),
('t06','br-v1','trabalho',6,'ECO', 1,1.00,null,null,'Privatizar estatais melhora o serviço prestado à população.',true,null),
('t07','br-v1','trabalho',7,'ECO',-1,0.80,null,null,'Motorista e entregador de aplicativo deveriam ter carteira assinada.',false,null),

-- seguranca e justica
('s01','br-v1','seguranca',1,'AUT', 1,1.00,null,null,'A polícia deve poder agir com mais força, mesmo que isso aumente o risco de erro.',true,null),
('s02','br-v1','seguranca',2,'AUT',-1,0.90,'SOC',0.40,'Portar droga para uso próprio não deveria ser crime.',true,null),
('s03','br-v1','seguranca',3,'AUT', 1,0.90,null,null,'A maioridade penal deve ser reduzida para 16 anos.',false,null),
('s04','br-v1','seguranca',4,'AUT', 1,0.80,'SOC',0.30,'Cidadão sem antecedentes deve poder comprar arma para se defender.',false,null),
('s05','br-v1','seguranca',5,'AUT',-1,0.90,null,null,'A prisão deve servir para recuperar quem cometeu o crime, não para punir.',false,null),
('s06','br-v1','seguranca',6,'AUT', 1,0.80,null,null,'Câmeras de reconhecimento facial devem ser usadas livremente em espaço público.',false,'ac_vigilancia'),
('s07','br-v1','seguranca',7,'AUT',-1,0.80,null,null,'O Estado não deve vigiar cidadão em espaço público sem suspeita individual.',false,'ac_vigilancia'),

-- costumes
('c01','br-v1','costumes',1,'SOC',-1,1.00,null,null,'A família formada por pai, mãe e filhos deve ser prioridade nas políticas públicas.',true,null),
('c02','br-v1','costumes',2,'SOC', 1,1.00,null,null,'A interrupção da gravidez deve ser decisão da mulher até certo ponto da gestação.',true,null),
('c03','br-v1','costumes',3,'SOC', 1,0.90,null,null,'Casais do mesmo sexo devem ter os mesmos direitos de adoção que os demais.',false,null),
('c04','br-v1','costumes',4,'SOC',-1,0.80,'AUT',0.30,'O ensino religioso deve ter espaço na escola pública.',false,null),
('c05','br-v1','costumes',5,'SOC', 1,0.90,null,null,'Pessoas trans devem ser reconhecidas legalmente pelo gênero com que se identificam.',false,null),
('c06','br-v1','costumes',6,'SOC',-1,0.90,null,null,'Valores tradicionais estão se perdendo, e isso é ruim para o país.',true,null),
('c07','br-v1','costumes',7,'SOC', 1,0.70,'AUT',0.40,'A maconha deveria ser legalizada e regulada como o álcool.',false,null),

-- democracia e instituicoes
('d01','br-v1','democracia',1,'DEM', 1,1.00,null,null,'Quando a maioria da população quer algo, o Judiciário não deveria poder impedir.',true,null),
('d02','br-v1','democracia',2,'DEM',-1,1.00,null,null,'Limite constitucional ao poder do presidente protege a democracia, mesmo contra a maioria.',false,null),
('d03','br-v1','democracia',3,'DEM', 1,1.00,'AUT',0.50,'Um líder forte que resolve vale mais que o debate lento do Congresso.',true,null),
('d04','br-v1','democracia',4,'DEM',-1,0.90,'AUT',0.40,'Imprensa livre para criticar o governo é essencial, mesmo quando ela erra.',false,null),
('d05','br-v1','democracia',5,'DEM', 1,0.80,null,null,'Decisão importante deveria ser tomada por plebiscito, e não pelo Congresso.',false,null),
('d06','br-v1','democracia',6,'DEM',-1,0.70,null,null,'Partidos e Congresso são peças necessárias de uma democracia.',false,'ac_instituicoes'),
('d07','br-v1','democracia',7,'DEM', 1,0.70,null,null,'O país funcionaria melhor sem partidos e sem Congresso.',false,'ac_instituicoes'),

-- meio ambiente
('a01','br-v1','ambiente',1,'AMB', 1,1.00,null,null,'Proteger a floresta vale a pena mesmo que custe emprego no curto prazo.',true,null),
('a02','br-v1','ambiente',2,'AMB',-1,0.90,'ECO',0.40,'O agronegócio deve poder expandir a área plantada sobre novas terras.',false,null),
('a03','br-v1','ambiente',3,'AMB', 1,0.90,'ECO',0.30,'O Brasil deve cobrar imposto sobre carbono de empresa poluidora.',false,null),
('a04','br-v1','ambiente',4,'AMB',-1,1.00,null,null,'A urgência climática é exagerada pelos meios de comunicação.',true,null),
('a05','br-v1','ambiente',5,'AMB', 1,0.90,null,null,'Terra indígena deve ser demarcada mesmo onde há interesse econômico.',false,null),
('a06','br-v1','ambiente',6,'AMB',-1,0.80,'ECO',0.30,'Explorar petróleo é necessário para o desenvolvimento do país agora.',false,null),

-- mundo
('m01','br-v1','mundo',1,'NAC', 1,1.00,null,null,'O Brasil deve priorizar seu interesse mesmo que enfraqueça acordos internacionais.',true,null),
('m02','br-v1','mundo',2,'NAC',-1,0.90,'ECO',0.40,'Acordo de livre comércio beneficia o brasileiro comum.',false,null),
('m03','br-v1','mundo',3,'NAC', 1,0.90,'SOC',0.30,'A entrada de imigrantes no Brasil deve ser mais restrita.',true,null),
('m04','br-v1','mundo',4,'NAC',-1,0.90,'DEM',0.30,'O Brasil deve acatar decisão de corte internacional de direitos humanos.',false,null),
('m05','br-v1','mundo',5,'NAC', 1,0.80,'ECO',0.40,'Produto nacional deve ser protegido por tarifa contra o importado.',false,null),
('m06','br-v1','mundo',6,'NAC',-1,0.80,null,null,'Receber trabalhador estrangeiro faz bem ao país.',false,null),

-- servicos publicos
('v01','br-v1','servicos',1,'ECO',-1,1.00,null,null,'Saúde e educação devem ser inteiramente públicas e gratuitas.',true,null),
('v02','br-v1','servicos',2,'ECO', 1,0.90,null,null,'Escola e hospital privados prestam melhor serviço e devem ser incentivados.',false,null),
('v03','br-v1','servicos',3,'ECO',-1,0.90,null,null,'A previdência deve ser pública e solidária, não conta individual de cada um.',false,null),
('v04','br-v1','servicos',4,'ECO', 1,0.90,'SOC',0.30,'Programa de transferência de renda acomoda quem poderia estar trabalhando.',false,null),
('v05','br-v1','servicos',5,'SOC', 1,0.70,'ECO',-0.50,'A universidade pública deve ter cota social e racial.',false,null),

-- tecnologia e informacao
('g01','br-v1','tecnologia',1,'AUT', 1,0.90,'DEM',0.30,'Rede social deve remover conteúdo falso por conta própria, sem ordem judicial.',false,null),
('g02','br-v1','tecnologia',2,'AUT',-1,0.90,null,null,'Só a Justiça deveria poder decidir o que sai do ar na internet.',true,null),
('g03','br-v1','tecnologia',3,'ECO',-1,0.80,'DEM',0.30,'As big techs devem ser reguladas por lei como qualquer outro setor.',false,null),
('g04','br-v1','tecnologia',4,'AUT', 1,0.90,null,null,'O Estado deve poder acessar mensagem privada em investigação criminal.',false,null),
('g05','br-v1','tecnologia',5,'DEM', 1,0.80,null,null,'A imprensa tradicional mente mais do que o que circula nas redes.',true,null);
