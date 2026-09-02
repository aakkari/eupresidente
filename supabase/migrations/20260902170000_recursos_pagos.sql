-- Recursos que nao sao blocos do report, mas tambem tem dono.
--
-- Criar comunidade e pago; entrar numa comunidade a convite e de graca. A
-- assimetria e proposital: se aceitar convite tambem custasse, o convite
-- morreria na caixa de entrada, e e justamente o amigo que entra sem pagar, ve
-- o mapa e quer o proprio que compra a anuidade seguinte.
insert into app_settings (key, value) values
  ('recursos', jsonb_build_object('criar_comunidade', 'assinante'))
on conflict (key) do nothing;
