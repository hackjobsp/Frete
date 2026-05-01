-- ==================================================
-- FreteJa Colatina - Execute no Supabase SQL Editor
-- https://supabase.com/dashboard/project/osdogwvqexflaqnmhnyx/sql/new
-- ==================================================

-- 1. Perfis de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'motorista')),
  avatar_url TEXT,
  cidade TEXT DEFAULT 'Colatina',
  rating DECIMAL(3,2) DEFAULT 0,
  total_fretes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Veiculos dos motoristas
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  motorista_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('carro', 'van', 'caminhao_pequeno', 'caminhao_grande')),
  placa TEXT NOT NULL,
  modelo TEXT NOT NULL,
  capacidade_kg INTEGER NOT NULL DEFAULT 500,
  verificado BOOLEAN DEFAULT false,
  cnh_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pedidos de frete
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.profiles(id) NOT NULL,
  motorista_id UUID REFERENCES public.profiles(id),
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  origem_lat DECIMAL(10,7) NOT NULL DEFAULT -19.5339,
  origem_lng DECIMAL(10,7) NOT NULL DEFAULT -40.6274,
  destino_lat DECIMAL(10,7) NOT NULL DEFAULT -19.5339,
  destino_lng DECIMAL(10,7) NOT NULL DEFAULT -40.6274,
  tipo TEXT NOT NULL CHECK (tipo IN ('frete', 'mudanca', 'entrega')),
  descricao TEXT NOT NULL,
  foto_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'em_andamento', 'concluido', 'cancelado')),
  preco_estimado DECIMAL(10,2) NOT NULL,
  preco_final DECIMAL(10,2),
  urgente BOOLEAN DEFAULT false,
  agendado_para TIMESTAMPTZ,
  distancia_km DECIMAL(8,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Propostas dos motoristas
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  motorista_id UUID REFERENCES public.profiles(id) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  mensagem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Avaliacoes pos-servico
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  avaliador_id UUID REFERENCES public.profiles(id) NOT NULL,
  avaliado_id UUID REFERENCES public.profiles(id) NOT NULL,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================================================
-- Row Level Security
-- ==================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Pedidos
DROP POLICY IF EXISTS "pedidos_read_all" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_own" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_own" ON public.pedidos;
CREATE POLICY "pedidos_read_all" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "pedidos_insert_own" ON public.pedidos FOR INSERT WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "pedidos_update_own" ON public.pedidos FOR UPDATE USING (auth.uid() = cliente_id OR auth.uid() = motorista_id);

-- Veiculos
DROP POLICY IF EXISTS "veiculos_read_all" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_manage_own" ON public.veiculos;
CREATE POLICY "veiculos_read_all" ON public.veiculos FOR SELECT USING (true);
CREATE POLICY "veiculos_manage_own" ON public.veiculos FOR ALL USING (auth.uid() = motorista_id);

-- Propostas
DROP POLICY IF EXISTS "propostas_read" ON public.propostas;
DROP POLICY IF EXISTS "propostas_insert" ON public.propostas;
DROP POLICY IF EXISTS "propostas_update" ON public.propostas;
CREATE POLICY "propostas_read" ON public.propostas FOR SELECT USING (
  auth.uid() = motorista_id OR
  auth.uid() IN (SELECT cliente_id FROM public.pedidos WHERE id = pedido_id)
);
CREATE POLICY "propostas_insert" ON public.propostas FOR INSERT WITH CHECK (auth.uid() = motorista_id);
CREATE POLICY "propostas_update" ON public.propostas FOR UPDATE USING (
  auth.uid() IN (SELECT cliente_id FROM public.pedidos WHERE id = pedido_id)
);

-- Avaliacoes
DROP POLICY IF EXISTS "avaliacoes_read_all" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_insert_own" ON public.avaliacoes;
CREATE POLICY "avaliacoes_read_all" ON public.avaliacoes FOR SELECT USING (true);
CREATE POLICY "avaliacoes_insert_own" ON public.avaliacoes FOR INSERT WITH CHECK (auth.uid() = avaliador_id);

-- ==================================================
-- Trigger: cria profile automaticamente no cadastro
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'cliente')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Confirma sucesso
SELECT 'FreteJa schema instalado com sucesso!' as resultado;
