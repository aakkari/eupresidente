-- EU PRESIDENTE — seed do instrumento v1
-- Nasce com active = false. Publique so depois de revisar o texto das
-- perguntas: a partir do momento em que ficar ativo, mudanca exige v2
-- (ver decisao 8 no CLAUDE.md). Para ativar:
--     update instruments set active = true where id = 'br-v1';

insert into instruments (id, label, axes, axis_weights, active) values (
'br-v1',
'Eu Presidente — Brasil, versao 1',
'{
  "ECO": {"nome":"Economia",   "neg":"Estado coordena",       "pos":"Mercado coordena"},
  "SOC": {"nome":"Costumes",   "neg":"Tradicao preserva",     "pos":"Autonomia individual"},
  "AUT": {"nome":"Autoridade", "neg":"Liberdade civil",       "pos":"Ordem e coercao"},
  "NAC": {"nome":"Fronteira",  "neg":"Integracao global",     "pos":"Soberania nacional"},
  "DEM": {"nome":"Poder",      "neg":"Instituicoes e freios", "pos":"Vontade popular direta"},
  "AMB": {"nome":"Horizonte",  "neg":"Crescimento hoje",      "pos":"Sustentabilidade longa"}
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
 'Mercado com coleira curta e rede de protecao larga',
 'Aceita a economia de mercado como motor, mas nao como arbitro. Defende Estado forte em saude, educacao e previdencia, tributacao progressiva e sindicato com poder real. Nos costumes e liberal; nas instituicoes, legalista. E a familia politica que construiu o Estado de bem-estar europeu do pos-guerra. Parentesco internacional: SPD alemao, trabalhismo britanico, social-democracia nordica.',
 ARRAY['Eduard Bernstein','John Rawls','Gosta Esping-Andersen','Tony Judt'],
 '{"ECO":-0.6,"SOC":0.5,"AUT":-0.2,"NAC":-0.2,"DEM":-0.3,"AMB":0.5}'::jsonb, true, '#C0392B'),

('socialista_democratico','br-v1','Socialista democratico',
 'A desigualdade e o problema, nao um efeito colateral',
 'Considera que a concentracao de riqueza corrompe a propria democracia, e que corrigi-la exige mais que politica social: exige mudar quem e dono do que. Defende servicos publicos universais, forte tributacao sobre patrimonio e ampliacao da propriedade coletiva. Democratico no metodo, radical no objetivo. Parentesco internacional: Podemos, France Insoumise, ala de Sanders nos EUA.',
 ARRAY['Karl Marx','Rosa Luxemburgo','Thomas Piketty','Nancy Fraser'],
 '{"ECO":-0.9,"SOC":0.6,"AUT":-0.3,"NAC":0.0,"DEM":0.2,"AMB":0.6}'::jsonb, true, '#8E1B1B'),

('verde_ecossocial','br-v1','Verde ecossocial',
 'O prazo do planeta e mais curto que o do PIB',
 'Trata o limite ecologico como restricao dura, nao como preferencia. Aceita perder crescimento para nao perder o sistema que sustenta a economia. Combina isso com pauta social progressista, poder local e desconfianca de grande escala — publica ou privada. No Brasil, cruza com a defesa de territorios indigenas como estrategia de conservacao. Parentesco internacional: Verdes alemaes, movimento climatico europeu.',
 ARRAY['Arne Naess','Elinor Ostrom','Ailton Krenak','Kate Raworth'],
 '{"ECO":-0.5,"SOC":0.7,"AUT":-0.4,"NAC":-0.4,"DEM":0.1,"AMB":0.95}'::jsonb, false, '#1E8449'),

('liberal_progressista','br-v1','Liberal progressista',
 'Mercado livre, costumes livres, poder vigiado',
 'Confia no mercado para alocar e no individuo para escolher como viver. Defende abertura comercial, imigracao e direitos individuais amplos, com Estado enxuto mas competente. Fortemente institucionalista: desconfia tanto de maioria quanto de lider. E o liberalismo no sentido classico da palavra, nao no uso brasileiro. Parentesco internacional: D66 holandes, LibDems britanicos, macronismo.',
 ARRAY['John Stuart Mill','John Rawls','Ronald Dworkin','Amartya Sen'],
 '{"ECO":0.4,"SOC":0.8,"AUT":-0.6,"NAC":-0.6,"DEM":-0.4,"AMB":0.4}'::jsonb, true, '#F1C40F'),

('libertario','br-v1','Libertario',
 'O Estado e o problema, quase sempre',
 'Parte do principio de que coercao precisa de justificativa e quase nunca tem uma boa. Defende Estado minimo, impostos baixos, e liberdade individual sem excecao — inclusive nas pautas que dividem esquerda e direita, como drogas e armas. Ceticismo simetrico: desconfia da regulacao economica e da regulacao moral. Parentesco internacional: Cato Institute, movimento libertario argentino.',
 ARRAY['Ludwig von Mises','Friedrich Hayek','Robert Nozick','Murray Rothbard'],
 '{"ECO":0.95,"SOC":0.7,"AUT":-0.8,"NAC":-0.3,"DEM":-0.2,"AMB":-0.3}'::jsonb, true, '#E8A33D'),

('conservador_liberal','br-v1','Conservador liberal',
 'Liberdade economica com freio cultural',
 'Defende mercado, propriedade e Estado pequeno, mas rejeita a ideia de que tudo deve mudar junto. Ve instituicoes, familia e religiao como capital acumulado que a sociedade nao deveria gastar por moda. Ordem publica firme, mudanca social lenta e testada. Parentesco internacional: Partido Conservador britanico, CDU alema em sua ala liberal.',
 ARRAY['Edmund Burke','Michael Oakeshott','Friedrich Hayek','Roger Scruton'],
 '{"ECO":0.7,"SOC":-0.5,"AUT":0.4,"NAC":0.3,"DEM":-0.2,"AMB":-0.3}'::jsonb, true, '#2E5C8A'),

('democrata_cristao','br-v1','Social-cristao',
 'Nem o Estado nem o mercado: a comunidade',
 'Rejeita tanto o coletivismo estatal quanto o individualismo de mercado, e coloca a familia e a comunidade como unidade central. Aceita Estado ativo em protecao social por dever moral, nao por projeto igualitario. Conservador nos costumes, moderado no resto. E a matriz da doutrina social crista e das democracias-cristas europeias do pos-guerra.',
 ARRAY['Jacques Maritain','Konrad Adenauer','Doutrina Social da Igreja','Wilhelm Ropke'],
 '{"ECO":-0.1,"SOC":-0.6,"AUT":0.2,"NAC":0.1,"DEM":-0.3,"AMB":0.2}'::jsonb, true, '#7D6608'),

('comunitarista','br-v1','Comunitarista',
 'Nao existe individuo solto no ar',
 'Discorda da premissa liberal de que a pessoa escolhe seus valores do zero: cada um nasce dentro de uma comunidade que ja o formou. Defende decisao local, vinculo, pertencimento, e desconfia de solucao universal imposta de cima — venha do Estado, do mercado ou de organismo internacional. Cruza pautas: pode ser progressista no ambiente e tradicional na familia.',
 ARRAY['Michael Sandel','Charles Taylor','Alasdair MacIntyre','Elinor Ostrom'],
 '{"ECO":-0.3,"SOC":-0.2,"AUT":0.0,"NAC":0.2,"DEM":0.2,"AMB":0.5}'::jsonb, false, '#6C3483'),

('nacional_conservador','br-v1','Nacional-conservador',
 'Nacao, ordem e continuidade, nesta ordem',
 'Coloca a soberania e a coesao nacional acima da abertura, e a ordem acima da liberdade quando as duas colidem. Defende fronteiras firmes, seguranca dura e preservacao dos costumes majoritarios. Aceita Estado economicamente ativo se for a servico do projeto nacional. Parentesco internacional: Fidesz hungaro, PiS polones, direita nacionalista europeia.',
 ARRAY['Carl Schmitt','Yoram Hazony','Samuel Huntington','Oswald Spengler'],
 '{"ECO":0.1,"SOC":-0.8,"AUT":0.7,"NAC":0.8,"DEM":0.3,"AMB":-0.5}'::jsonb, true, '#1B3A5C'),

('nacional_popular','br-v1','Nacional-popular',
 'O povo contra quem manda',
 'Organiza a politica como conflito entre o povo real e uma elite que o traiu — midia, Judiciario, partidos, organismos internacionais. Combina protecao economica e social com costumes tradicionais e autoridade forte. E uma gramatica de poder mais que uma doutrina, e por isso aparece na esquerda e na direita. Parentesco internacional: peronismo, e o populismo contemporaneo em suas duas versoes.',
 ARRAY['Ernesto Laclau','Chantal Mouffe','Juan Peron','Jan-Werner Muller (critica)'],
 '{"ECO":-0.4,"SOC":-0.5,"AUT":0.6,"NAC":0.9,"DEM":0.8,"AMB":-0.5}'::jsonb, true, '#943126'),

('nacional_desenvolvimentista','br-v1','Nacional-desenvolvimentista',
 'Industria propria e o que separa pais de colonia',
 'Ve o subdesenvolvimento como resultado da posicao do pais na divisao internacional do trabalho, nao como atraso a ser corrigido pelo mercado. Defende Estado planejador, industria nacional protegida, banco publico e politica externa autonoma. E a tradicao economica mais influente da historia republicana brasileira.',
 ARRAY['Celso Furtado','Raul Prebisch','Friedrich List','Luiz Carlos Bresser-Pereira'],
 '{"ECO":-0.8,"SOC":0.1,"AUT":0.2,"NAC":0.7,"DEM":0.5,"AMB":-0.2}'::jsonb, false, '#117A65'),

('tecnocrata_centrista','br-v1','Tecnocrata',
 'A resposta certa nao se decide por votacao',
 'Confia em evidencia, quadro tecnico e instituicao independente mais do que em disputa eleitoral. Pragmatico nos eixos economico e social — pega o que funciona de cada lado — mas fortemente contrario a decisao por maioria em materia complexa. Defende banco central autonomo, agencia reguladora forte e politica publica avaliada por dado. Parentesco internacional: tecnocracia europeia, escola de politica publica baseada em evidencia.',
 ARRAY['Max Weber','Joseph Schumpeter','Esther Duflo','Mariana Mazzucato (critica)'],
 '{"ECO":0.2,"SOC":0.2,"AUT":0.1,"NAC":-0.3,"DEM":-0.8,"AMB":0.3}'::jsonb, false, '#5D6D7E');

-- --------------------------------------------------------------- perguntas
-- direction = -1 inverte a pergunta: concordar empurra para o polo negativo.
-- Metade de cada eixo e redigida na direcao oposta, para quebrar aquiescencia
-- (a tendencia de concordar com tudo, que e o vies mais comum em Likert).
-- 16 marcadas in_short compoem a versao viral, cobrindo os 6 eixos.

insert into questions (id, instrument_id, block, ord, axis, direction, weight, secondary_axis, secondary_weight, body, in_short, attention_pair) values

-- trabalho e renda
('t01','br-v1','trabalho',1,'ECO',-1,1.00,null,null,'O Estado deve ser dono das empresas de setores estrategicos, como energia e petroleo.',false,null),
('t02','br-v1','trabalho',2,'ECO', 1,0.90,null,null,'Reduzir impostos sobre empresas gera mais emprego do que programa publico de geracao de renda.',false,null),
('t03','br-v1','trabalho',3,'ECO',-1,0.90,null,null,'O salario minimo deve subir acima da inflacao mesmo que aumente o custo para quem emprega.',false,null),
('t04','br-v1','trabalho',4,'ECO', 1,1.00,null,null,'A lei trabalhista brasileira protege demais o empregado e trava a contratacao.',true,null),
('t05','br-v1','trabalho',5,'ECO',-1,1.00,null,null,'Grandes fortunas devem pagar imposto sobre patrimonio, e nao apenas sobre renda.',false,null),
('t06','br-v1','trabalho',6,'ECO', 1,1.00,null,null,'Privatizar estatais melhora o servico prestado a populacao.',true,null),
('t07','br-v1','trabalho',7,'ECO',-1,0.80,null,null,'Motorista e entregador de aplicativo deveriam ter carteira assinada.',false,null),

-- seguranca e justica
('s01','br-v1','seguranca',1,'AUT', 1,1.00,null,null,'A policia deve poder agir com mais forca, mesmo que isso aumente o risco de erro.',true,null),
('s02','br-v1','seguranca',2,'AUT',-1,0.90,'SOC',0.40,'Portar droga para uso proprio nao deveria ser crime.',true,null),
('s03','br-v1','seguranca',3,'AUT', 1,0.90,null,null,'A maioridade penal deve ser reduzida para 16 anos.',false,null),
('s04','br-v1','seguranca',4,'AUT', 1,0.80,'SOC',0.30,'Cidadao sem antecedentes deve poder comprar arma para se defender.',false,null),
('s05','br-v1','seguranca',5,'AUT',-1,0.90,null,null,'A prisao deve servir para recuperar quem cometeu o crime, nao para punir.',false,null),
('s06','br-v1','seguranca',6,'AUT', 1,0.80,null,null,'Cameras de reconhecimento facial devem ser usadas livremente em espaco publico.',false,'ac_vigilancia'),
('s07','br-v1','seguranca',7,'AUT',-1,0.80,null,null,'O Estado nao deve vigiar cidadao em espaco publico sem suspeita individual.',false,'ac_vigilancia'),

-- costumes
('c01','br-v1','costumes',1,'SOC',-1,1.00,null,null,'A familia formada por pai, mae e filhos deve ser prioridade nas politicas publicas.',true,null),
('c02','br-v1','costumes',2,'SOC', 1,1.00,null,null,'A interrupcao da gravidez deve ser decisao da mulher ate certo ponto da gestacao.',true,null),
('c03','br-v1','costumes',3,'SOC', 1,0.90,null,null,'Casais do mesmo sexo devem ter os mesmos direitos de adocao que os demais.',false,null),
('c04','br-v1','costumes',4,'SOC',-1,0.80,'AUT',0.30,'O ensino religioso deve ter espaco na escola publica.',false,null),
('c05','br-v1','costumes',5,'SOC', 1,0.90,null,null,'Pessoas trans devem ser reconhecidas legalmente pelo genero com que se identificam.',false,null),
('c06','br-v1','costumes',6,'SOC',-1,0.90,null,null,'Valores tradicionais estao se perdendo, e isso e ruim para o pais.',true,null),
('c07','br-v1','costumes',7,'SOC', 1,0.70,'AUT',0.40,'A maconha deveria ser legalizada e regulada como o alcool.',false,null),

-- democracia e instituicoes
('d01','br-v1','democracia',1,'DEM', 1,1.00,null,null,'Quando a maioria da populacao quer algo, o Judiciario nao deveria poder impedir.',true,null),
('d02','br-v1','democracia',2,'DEM',-1,1.00,null,null,'Limite constitucional ao poder do presidente protege a democracia, mesmo contra a maioria.',false,null),
('d03','br-v1','democracia',3,'DEM', 1,1.00,'AUT',0.50,'Um lider forte que resolve vale mais que o debate lento do Congresso.',true,null),
('d04','br-v1','democracia',4,'DEM',-1,0.90,'AUT',0.40,'Imprensa livre para criticar o governo e essencial, mesmo quando ela erra.',false,null),
('d05','br-v1','democracia',5,'DEM', 1,0.80,null,null,'Decisao importante deveria ser tomada por plebiscito, e nao pelo Congresso.',false,null),
('d06','br-v1','democracia',6,'DEM',-1,0.70,null,null,'Partidos e Congresso sao pecas necessarias de uma democracia.',false,'ac_instituicoes'),
('d07','br-v1','democracia',7,'DEM', 1,0.70,null,null,'O pais funcionaria melhor sem partidos e sem Congresso.',false,'ac_instituicoes'),

-- meio ambiente
('a01','br-v1','ambiente',1,'AMB', 1,1.00,null,null,'Proteger a floresta vale a pena mesmo que custe emprego no curto prazo.',true,null),
('a02','br-v1','ambiente',2,'AMB',-1,0.90,'ECO',0.40,'O agronegocio deve poder expandir a area plantada sobre novas terras.',false,null),
('a03','br-v1','ambiente',3,'AMB', 1,0.90,'ECO',0.30,'O Brasil deve cobrar imposto sobre carbono de empresa poluidora.',false,null),
('a04','br-v1','ambiente',4,'AMB',-1,1.00,null,null,'A urgencia climatica e exagerada pelos meios de comunicacao.',true,null),
('a05','br-v1','ambiente',5,'AMB', 1,0.90,null,null,'Terra indigena deve ser demarcada mesmo onde ha interesse economico.',false,null),
('a06','br-v1','ambiente',6,'AMB',-1,0.80,'ECO',0.30,'Explorar petroleo e necessario para o desenvolvimento do pais agora.',false,null),

-- mundo
('m01','br-v1','mundo',1,'NAC', 1,1.00,null,null,'O Brasil deve priorizar seu interesse mesmo que enfraqueca acordos internacionais.',true,null),
('m02','br-v1','mundo',2,'NAC',-1,0.90,'ECO',0.40,'Acordo de livre comercio beneficia o brasileiro comum.',false,null),
('m03','br-v1','mundo',3,'NAC', 1,0.90,'SOC',0.30,'A entrada de imigrantes no Brasil deve ser mais restrita.',true,null),
('m04','br-v1','mundo',4,'NAC',-1,0.90,'DEM',0.30,'O Brasil deve acatar decisao de corte internacional de direitos humanos.',false,null),
('m05','br-v1','mundo',5,'NAC', 1,0.80,'ECO',0.40,'Produto nacional deve ser protegido por tarifa contra o importado.',false,null),
('m06','br-v1','mundo',6,'NAC',-1,0.80,null,null,'Receber trabalhador estrangeiro faz bem ao pais.',false,null),

-- servicos publicos
('v01','br-v1','servicos',1,'ECO',-1,1.00,null,null,'Saude e educacao devem ser inteiramente publicas e gratuitas.',true,null),
('v02','br-v1','servicos',2,'ECO', 1,0.90,null,null,'Escola e hospital privados prestam melhor servico e devem ser incentivados.',false,null),
('v03','br-v1','servicos',3,'ECO',-1,0.90,null,null,'A previdencia deve ser publica e solidaria, nao conta individual de cada um.',false,null),
('v04','br-v1','servicos',4,'ECO', 1,0.90,'SOC',0.30,'Programa de transferencia de renda acomoda quem poderia estar trabalhando.',false,null),
('v05','br-v1','servicos',5,'SOC', 1,0.70,'ECO',-0.50,'A universidade publica deve ter cota social e racial.',false,null),

-- tecnologia e informacao
('g01','br-v1','tecnologia',1,'AUT', 1,0.90,'DEM',0.30,'Rede social deve remover conteudo falso por conta propria, sem ordem judicial.',false,null),
('g02','br-v1','tecnologia',2,'AUT',-1,0.90,null,null,'So a Justica deveria poder decidir o que sai do ar na internet.',true,null),
('g03','br-v1','tecnologia',3,'ECO',-1,0.80,'DEM',0.30,'As big techs devem ser reguladas por lei como qualquer outro setor.',false,null),
('g04','br-v1','tecnologia',4,'AUT', 1,0.90,null,null,'O Estado deve poder acessar mensagem privada em investigacao criminal.',false,null),
('g05','br-v1','tecnologia',5,'DEM', 1,0.80,null,null,'A imprensa tradicional mente mais do que o que circula nas redes.',true,null);
