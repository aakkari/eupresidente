-- Intensidade da afirmacao, de 1 a 5.
--
-- E o que da resolucao nas pontas da escala. Uma pergunta branda ("o Estado
-- deve regular os bancos") quase todo mundo aceita; uma forte ("o Estado deve
-- ser dono dos bancos") so quem esta longe do centro. Sem esse escalonamento,
-- 90 perguntas de intensidade parecida medem a mesma coisa 90 vezes e o
-- extremo nao se separa do convicto.
--
-- Nao entra no calculo do vetor — quem pondera e o weight. Serve para
-- calibrar o instrumento e para o painel de metricas mostrar se cada faceta
-- tem cobertura em toda a faixa.
alter table questions add column if not exists intensity smallint
  check (intensity between 1 and 5);

comment on column questions.intensity is
  '1 = quase consensual, 5 = so quem e radical concorda. Cada faceta precisa de itens em toda a faixa, senao mede so o meio.';

create index if not exists questions_intensity_idx on questions (instrument_id, facet, intensity);
